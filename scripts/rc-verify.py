#!/usr/bin/env python3
"""Finite RC automatic product gate (RC-02.04 incremental orchestration).

Packs once into --out, runs every currently implemented automatic check against
that artifact, and fails closed for any required check that is missing,
unknown, unimplemented, or red. Does not publish, does not run private Cyph,
and does not claim G01–G13 while required cells remain open.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
import tempfile
import shutil
import uuid
from contextlib import contextmanager

# Script and unittest/importlib execution both resolve this local helper.
if str(Path(__file__).resolve().parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
from rc_acceptance import (
    CHECK_CONTRACT, EvidenceError, binding_for, evaluate_run, read_json,
    validate_matrix, checked_file, sha256_file as evidence_sha256,
    assertion_directory, prepack_binding_for,
)
from archive_run_closure import ClosureError, write_closure

ROOT = Path(__file__).resolve().parents[1]
MATRIX_PATH = ROOT / "compatibility/rc/matrices/full-verify.json"
ACTIVE_RUN = None

# Explicit legacy output locations. Capturing these preserves existing domain
# runners while preventing any old fixed-path report from becoming fresh proof.
FIXED_DETAILS = {
    "scripts/engine-free-consumer.mjs": ("engine-free-consumer", "compatibility/rc/reports/engine-free-consumer.json"),
    "scripts/sass-seal.mjs": ("sass-seal", "compatibility/rc/reports/sass-seal.json"),
    "scripts/check-companion-bridges.mjs": ("companion-bridge-tokens", "compatibility/rc/reports/companion-bridge-tokens.json"),
    "scripts/check-companion-computed-styles.mjs": ("companion-computed-styles", "compatibility/rc/reports/companion-computed-styles.json"),
    "scripts/run-browser-matrix-slice.mjs": ("browser-matrix", "compatibility/rc/reports/browser-matrix-slice.json"),
    "scripts/api-completeness.mjs": ("api-completeness", "compatibility/rc/reports/api-completeness.json"),
}
SCRIPT_CHECKS = {
    **{script: item[0] for script, item in FIXED_DETAILS.items()},
    "scripts/pack-draft-run.mjs": "pack-library",
    "scripts/check-pack-library.mjs": "pack-library",
    "scripts/check-packed-exports.mjs": "packed-exports",
    "scripts/check-upstream-audit-disposition.mjs": "upstream-audit-disposition",
    "scripts/check-source-policy.py": "source-policy",
    "scripts/check-dependency-eligibility.py": "dependency-eligibility",
    "scripts/packed-consumer-aot-smoke.mjs": "packed-consumer",
    "scripts/motion-lifecycle-smoke.mjs": "motion-smoke",
    "scripts/native-motion-acceptance.mjs": "native-motion",
    "scripts/csp-ssr-acceptance.mjs": "csp-ssr",
    "scripts/build-migrate-legacy-cli.mjs": "migration-packaged",
    "scripts/migration-cli-isolation.mjs": "migration-packaged",
    "scripts/check-old-workspace-cli.mjs": "migration-packaged",
    "scripts/migration-transaction.mjs": "migration-packaged",
    "scripts/check-frontend-parity.mjs": "migration-packaged",
    "scripts/check-packaged-schematic.mjs": "migration-packaged",
    "scripts/rc-test-legacy-family.mjs": "historical-legacy-artifact",
    "scripts/check-m3-inclusion-order.mjs": "m3-coexistence",
    "scripts/check-consumer-floors.mjs": "consumer-floors",
    "scripts/check-release-metadata.mjs": "release-metadata",
}


class RunEvidence:
    """One coordinator's captured identities and actual child outcomes."""
    def __init__(self, manifest, run_dir, matrix_digest, *, pack_execution=None):
        self.manifest = manifest
        self.run_dir = run_dir
        self.matrix_digest = matrix_digest
        self.binding = binding_for(manifest, matrix_digest)
        self.invocations = {}
        self.exit_codes = {}
        self.outputs = {}
        self.pack_execution = pack_execution
        if pack_execution is not None:
            expected = prepack_binding_for(manifest['run_id'], manifest['execution_inputs'],
                                           manifest['environment'], manifest['oracles'], matrix_digest)
            if pack_execution.get('binding') != expected or pack_execution.get('status') != 'completed':
                raise EvidenceError('pack invocation does not match the frozen prepack inputs')
            self.invocations['pack-library'] = pack_execution['invocation_id']
            self.record_exit('pack-library', pack_execution['exit_code'])

    def invocation(self, check_id):
        return self.invocations.setdefault(check_id, uuid.uuid4().hex)

    def record_exit(self, check_id, code):
        previous = self.exit_codes.get(check_id, 0)
        self.exit_codes[check_id] = previous if previous != 0 else code

    def subject(self, check_id):
        _, kind, ids, _ = CHECK_CONTRACT[check_id]
        if check_id == 'migration-packaged':
            # frontend-parity and packaged-schematic both run ng generate of the
            # packed library. coverage stays slice and every 21.x migration group
            # stays unresolved, so this slice still does not claim the library as
            # an acceptance subject and does not claim G04 or G05.
            ids = ('migrate-cli',)
        artifacts = {
            item['id']: {'sha256': item['sha256'], 'bytes': item['bytes']}
            for item in self.manifest.get('artifacts', []) if item['id'] in ids
        }
        return {'subject_kind': kind, 'subject_ids': list(ids), 'artifacts': artifacts}


@contextmanager
def capture_fixed_report(root, run_dir, relative_path, check_id):
    """Temporarily remove the old file; never use mtime as freshness evidence.

    Preserve the original in a unique backup and restore it even if the child
    fails. Only a newly created regular JSON file is retained as this invocation's
    supplemental detail. Full acceptance still validates its case-level report.
    """
    source = root / relative_path
    if any(p.is_symlink() for p in [source, *source.parents] if p != root.parent):
        raise EvidenceError(f'symlink in fixed report path: {relative_path}')
    source.parent.mkdir(parents=True, exist_ok=True)
    details = run_dir / 'reports/details'
    details.mkdir(parents=True, exist_ok=True)
    dest = details / f'{check_id}.json'
    if dest.exists():
        raise EvidenceError(f'output already exists for {check_id}: {dest}')
    # Keep rename/restore on the source filesystem even when --out is on /tmp.
    backup = source.with_name(f'.saved-{check_id}-{uuid.uuid4().hex}.json')
    had_original = source.exists()
    if had_original:
        if not source.is_file():
            raise EvidenceError(f'fixed report is not a file: {relative_path}')
        source.rename(backup)
    try:
        yield dest
        if source.is_symlink() or not source.is_file():
            raise EvidenceError(f'{check_id}: child did not produce a new regular detail report')
        read_json(source)  # Malformed or duplicate-key JSON is not evidence.
        shutil.copyfile(source, dest)
    finally:
        if source.is_symlink() or source.is_file():
            source.unlink()
        elif source.exists():
            # Do not recursively delete an unexpected child-created directory.
            raise EvidenceError(f'unsafe child output at {source}; recovery file: {backup}')
        if had_original:
            backup.rename(source)


@contextmanager
def verifier_lock(root):
    """Serialize full verifiers while legacy children still have fixed outputs."""
    import fcntl
    lock_dir = root / 'artifacts'
    if lock_dir.is_symlink() or (lock_dir / '.full-verify.lock').is_symlink():
        raise EvidenceError('refuse symlinked verifier lock path')
    lock_dir.mkdir(parents=True, exist_ok=True)
    with (lock_dir / '.full-verify.lock').open('a') as stream:
        try:
            fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise EvidenceError('another full verifier owns the fixed report paths') from error
        try:
            yield
        finally:
            fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


def classify_input(path):
    """Role of a fingerprinted path. Reports stay excluded; this does not ignore locks or checkers."""
    name = path.replace('\\', '/')
    if name.startswith('compatibility/rc/reports/') or name == 'compatibility/pack-proof/motion-lifecycle-smoke.json':
        return 'derived-diagnostic'
    if name in {'pnpm-lock.yaml', 'toolchain-lock.json', 'chainman.lock', '.npm-version', '.node-version'}:
        return 'lock'
    if name.startswith('compatibility/rc/matrices/'):
        return 'matrix'
    if name == 'compatibility/provenance.json' or name.startswith('compatibility/pack-proof/historical-unbound/'):
        return 'oracle'
    if name.startswith('projects/'):
        return 'product-source'
    if name.startswith('scripts/') or name.startswith('tests/') or name == 'justfile':
        return 'checker'
    return 'consumed-input'


def _file_record(path, role):
    if path.is_symlink():
        payload = b'link:' + os.readlink(path).encode()
        return {'sha256': hashlib.sha256(payload).hexdigest(), 'role': role, 'payload': payload, 'missing': False}
    if not path.exists():
        return {'sha256': None, 'role': role, 'payload': b'missing', 'missing': True}
    if path.is_dir():
        return {'sha256': None, 'role': role, 'payload': b'directory', 'missing': False}
    payload = str(path.stat().st_mode).encode() + b'\0' + path.read_bytes()
    return {'sha256': hashlib.sha256(payload).hexdigest(), 'role': role, 'payload': payload, 'missing': False}


def source_line_for_library_version(version):
    """Map an advertised library version to the checkout line this verifier accepts.

    Major 21 is the 21.x line. Major 22 is main. Any other major is not a
    supported checkout line. A synthetic version string is not a checkout.
    """
    major = version.split('.', 1)[0] if isinstance(version, str) else ''
    if major not in ('21', '22'):
        raise EvidenceError('cannot determine the supported source line from library version')
    return '21.x' if major == '21' else 'main'


def require_line_matches_checkout(requested_line, checkout_line):
    """Reject --line when it disagrees with the checkout library version's line."""
    if checkout_line != requested_line:
        fail('--line does not match this checkout library version')


def observe_inputs(root):
    """Fingerprint plus per-path hashes. The aggregate digest matches the historical tracked-file loop."""
    def git(*args):
        result = subprocess.run(['git', *args], cwd=root, capture_output=True, check=True)
        return result.stdout
    commit = git('rev-parse', 'HEAD').decode().strip()
    tree = git('rev-parse', 'HEAD^{tree}').decode().strip()
    names = git('ls-files', '-z').decode().split('\0')
    digest = hashlib.sha256()
    files = {}
    for name in sorted(filter(None, names)):
        if name.startswith('compatibility/rc/reports/'):
            continue  # Legacy generated outputs, not the contract/runner inputs.
        record = _file_record(root / name, classify_input(name))
        digest.update(name.encode() + b'\0')
        digest.update(record['payload'])
        files[name] = {'sha256': record['sha256'], 'role': record['role'], 'missing': record['missing']}
    status = git('status', '--porcelain', '--untracked-files=all', '--', '.', ':(exclude)compatibility/rc/reports')
    digest.update(status)
    status_lines = [line for line in status.decode().splitlines() if line]
    for line in status_lines:
        if not line.startswith('?? '):
            continue
        name = line[3:]
        if name in files or name.startswith('compatibility/rc/reports/'):
            continue
        record = _file_record(root / name, classify_input(name))
        files[name] = {'sha256': record['sha256'], 'role': record['role'], 'missing': record['missing']}
    package = read_json(root / 'projects/ngx-material-legacy/package.json')
    version = package.get('version', '')
    checkout_line = source_line_for_library_version(version)
    locks = {}
    for name in ('chainman.lock', 'pnpm-lock.yaml', 'toolchain-lock.json', '.node-version', '.npm-version'):
        candidate = root / name
        if candidate.is_file() and not candidate.is_symlink():
            locks[name] = hashlib.sha256(candidate.read_bytes()).hexdigest()
    fingerprint = {'commit': commit, 'tree': tree, 'inputs_sha256': digest.hexdigest(),
                   'clean': not status.strip(), 'line': checkout_line}
    return {'fingerprint': fingerprint, 'files': files, 'status_lines': status_lines, 'locks': locks}


def source_fingerprint(root):
    """Detect source/tool/test changes during execution; no synthetic Git fallback."""
    return observe_inputs(root)['fingerprint']


def describe_input_drift(before, after):
    """Changed, missing, and new input paths with before/after hashes. No file contents."""
    changes = []
    for path in sorted(set(before['files']) | set(after['files'])):
        left = before['files'].get(path)
        right = after['files'].get(path)
        if left == right:
            continue
        if left is None:
            change = 'new'
        elif right is None or right.get('missing') is True:
            change = 'missing'
        else:
            change = 'changed'
        role = (right or left).get('role') or classify_input(path)
        changes.append({
            'path': path,
            'change': change,
            'role': role,
            'before_sha256': None if left is None else left.get('sha256'),
            'after_sha256': None if right is None else right.get('sha256'),
        })
    explained = {item['path'] for item in changes}
    for line in sorted(set(after.get('status_lines') or []) - set(before.get('status_lines') or [])):
        path = line[3:] if len(line) > 3 else line
        if path in explained:
            continue
        changes.append({
            'path': path,
            'change': 'status',
            'role': classify_input(path),
            'before_sha256': None,
            'after_sha256': None,
        })
    if not changes and before['fingerprint'] != after['fingerprint']:
        changes.append({
            'path': '(aggregate)',
            'change': 'changed',
            'role': 'consumed-input',
            'before_sha256': before['fingerprint'].get('inputs_sha256'),
            'after_sha256': after['fingerprint'].get('inputs_sha256'),
        })
    return changes


def format_input_drift(changes):
    return [
        f"{item['change']} {item['role']} {item['path']} before={item['before_sha256']} after={item['after_sha256']}"
        for item in changes
    ]



def pack_environment(root):
    """Freeze the same declared environment/oracle fields as the run writer.

    No output artifact identity is knowable here. The coordinator checks these
    fields against the writer's post-build manifest before it runs consumers.
    """
    def version(command):
        child = subprocess.run([command, '-v'], cwd=root, capture_output=True, text=True, check=True)
        return (child.stdout or child.stderr).strip().splitlines()[0]
    pkg = read_json(root / 'package.json')
    provenance = read_json(root / 'compatibility/provenance.json')
    node_platform = subprocess.run(['node', '-p', 'process.platform + "-" + process.arch'],
                                  cwd=root, capture_output=True, text=True, check=True).stdout.strip()
    environment = {
        'chainman_revision': (root / 'chainman.lock').read_text().strip(),
        'lock_sha256': evidence_sha256(root / 'pnpm-lock.yaml'),
        'install_policy_sha256': evidence_sha256(root / 'toolchain-lock.json'),
        'tool_versions': {name: version(name) for name in ('node', 'pnpm', 'npm')},
        'mode': os.environ.get('CHAINMAN_MODE') or 'unqualified-host',
        'platform': node_platform,
    }
    oracles = {
        'historical': [{'id': 'angular-components', 'tag': provenance['baseline_tag'],
                        'commit': provenance['baseline_full_commit']}],
        'current_peer': [{'id': name, 'version': pkg.get('devDependencies', {}).get(name)}
                         for name in ('@angular/core', '@angular/cdk', '@angular/material')],
    }
    return environment, oracles


def execute_pack(out_dir, line, source_inputs, matrix_digest):
    """Assign and persist the input-only invocation BEFORE starting the pack.

    pack-library is coordinator-owned: its final report binds resulting bytes,
    but never claims that a subprocess received hashes that did not yet exist.
    Failure/interrupt records are retained even when no run.json is produced.
    """
    environment, oracles = pack_environment(ROOT)
    run_id = f"verify-{line.replace('.', '')}-{source_inputs['commit'][:12]}-{uuid.uuid4().hex}"
    invocation_id = uuid.uuid4().hex
    binding = prepack_binding_for(run_id, source_inputs, environment, oracles, matrix_digest)
    record = {
        'schema_version': 1, 'check_id': 'pack-library', 'run_id': run_id,
        'invocation_id': invocation_id, 'binding': binding, 'status': 'running',
        'command': ['node', str(ROOT / 'scripts/pack-draft-run.mjs'), '--line', line, '--out', str(out_dir)],
        'started_at': datetime.now(timezone.utc).isoformat(), 'finished_at': None, 'exit_code': None,
    }
    record_path = out_dir / 'pack-execution.json'
    with record_path.open('x') as stream:
        json.dump(record, stream, indent=2)
        stream.write('\n')
    output_dir = out_dir / assertion_directory('pack-library', invocation_id)
    output_dir.mkdir(parents=True, exist_ok=False)
    env = {**os.environ, 'RC_CHECK_ID': 'pack-library', 'RC_RUN_ID': run_id,
           'RC_INVOCATION_ID': invocation_id, 'RC_EVIDENCE_BINDING': json.dumps(binding, sort_keys=True),
           'RC_ASSERTION_OUTPUT_DIR': str(output_dir)}
    code = 1
    try:
        code = subprocess.run(record['command'], cwd=ROOT, env=env).returncode
        record['status'] = 'completed'
    except KeyboardInterrupt:
        record['status'] = 'interrupted'
        code = 130
        raise
    except OSError as error:
        record['status'] = 'launch-failed'
        record['error'] = str(error)
        raise
    finally:
        record['exit_code'] = code
        record['finished_at'] = datetime.now(timezone.utc).isoformat()
        temporary = record_path.with_suffix('.writing')
        with temporary.open('x') as stream:
            json.dump(record, stream, indent=2)
            stream.write('\n')
        temporary.replace(record_path)
    return record

def check_existing_run(argv):
    """Read-only recheck for the sealer. The expected matrix hash is caller-pinned.

    A hash is an identity, not approval: use this only with reviewed source and
    a trusted execution record. This command never authenticates a reviewer.
    """
    values = {}
    if len(argv) != 4:
        fail('usage: --check-run --run <run.json> --expected-matrix-sha256 <reviewed-hash>')
    for flag, value in zip(argv[::2], argv[1::2]):
        if flag not in ('--run', '--expected-matrix-sha256') or flag in values or not value or value.startswith('--'):
            fail('invalid or duplicate --check-run option')
        values[flag] = value
    if set(values) != {'--run', '--expected-matrix-sha256'}:
        fail('--check-run needs the run and caller-pinned matrix identity')
    run_path = Path(values['--run']).resolve()
    run = read_json(run_path)
    record_path = checked_file(run_path.parent, run.get('execution_record'), 'coordinator execution record')
    record = read_json(record_path)
    if record.get('run_id') != run.get('run_id'):
        fail('coordinator record belongs to another run')
    recorded_inputs = run.get('execution_inputs') or {}
    current_inputs = source_fingerprint(ROOT)
    if current_inputs != recorded_inputs:
        bits = []
        for key in ('commit', 'tree', 'inputs_sha256', 'clean', 'line'):
            if current_inputs.get(key) != recorded_inputs.get(key):
                bits.append(f"{key} recorded={recorded_inputs.get(key)} current={current_inputs.get(key)}")
        fail('source/checker inputs differ from the recorded execution: ' + '; '.join(bits))
    result = evaluate_run(ROOT, run_path, matrix_sha256=values['--expected-matrix-sha256'],
        binding=record.get('binding', {}), process_results=record.get('process_results', {}),
        invocation_ids=record.get('invocation_ids', {}))
    print(json.dumps(result, indent=2))
    return 0 if result['automatic_product_result'] == 'pass' else 2


def fail(message: str, code: int = 2) -> None:
    print(f"verify: {message}", file=sys.stderr)
    raise SystemExit(code)


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_args(argv: list[str]) -> tuple[Path, str]:
    out: Path | None = None
    line = "main"
    i = 0
    seen = set()
    while i < len(argv):
        arg = argv[i]
        if arg in seen:
            fail(f'duplicate argument: {arg}')
        seen.add(arg)
        if arg in ("--out", "--line"):
            if i + 1 >= len(argv) or argv[i + 1].startswith("-"):
                fail(f"{arg} requires a value")
            if arg == "--out":
                out = (ROOT / argv[i + 1]).resolve() if not Path(argv[i + 1]).is_absolute() else Path(argv[i + 1])
            else:
                line = argv[i + 1]
            i += 2
            continue
        fail(f"Unknown argument: {arg}")
    if out is None:
        print("usage: just verify --out <run-directory> [--line main|21.x]", file=sys.stderr)
        fail("full product gate requires --out")
    if line not in ("main", "21.x"):
        fail("--line must be main or 21.x")
    return out, line


def run_node(script: str, args: list[str], *, record: bool = True) -> int:
    if script.endswith(".py"):
        cmd = [sys.executable, str(ROOT / script), *args]
    else:
        cmd = ["node", str(ROOT / script), *args]
    print("verify:", " ".join(cmd), flush=True)
    if ACTIVE_RUN is None:
        return subprocess.run(cmd, cwd=ROOT).returncode
    check_id = SCRIPT_CHECKS[script]
    invocation = ACTIVE_RUN.invocation(check_id)
    output_dir = ACTIVE_RUN.run_dir / assertion_directory(check_id, invocation)
    output_dir.mkdir(parents=True, exist_ok=True)
    env = {**os.environ, 'RC_INVOCATION_ID': invocation, 'RC_CHECK_ID': check_id,
           'RC_ASSERTION_OUTPUT_DIR': str(output_dir),
           'RC_EVIDENCE_BINDING': json.dumps(ACTIVE_RUN.binding, sort_keys=True),
           'RC_RUN_ID': ACTIVE_RUN.manifest['run_id']}
    code = 1
    try:
        if script in FIXED_DETAILS:
            _, fixed_path = FIXED_DETAILS[script]
            with capture_fixed_report(ROOT, ACTIVE_RUN.run_dir, fixed_path, check_id) as output:
                code = subprocess.run(cmd, cwd=ROOT, env=env).returncode
            ACTIVE_RUN.outputs[check_id] = [{
                'path': output.relative_to(ACTIVE_RUN.run_dir).as_posix(),
                'sha256': evidence_sha256(output), 'bytes': output.stat().st_size,
            }]
        else:
            code = subprocess.run(cmd, cwd=ROOT, env=env).returncode
    except (EvidenceError, OSError) as error:
        print(f'verify: {error}', file=sys.stderr)
        code = code or 1
    if record:
        ACTIVE_RUN.record_exit(check_id, code)
    return code


def write_missing_report(run_dir: Path, run_id: str, line: str, check_id: str, reason: str) -> None:
    reports = run_dir / "reports"
    reports.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": 1,
        "template": False,
        "run_id": run_id,
        "check_id": check_id,
        "line": line,
        "subject_kind": "artifact",
        "subject_ids": ["library"],
        "command": ["rc-verify.py", "--missing", check_id],
        "exit_code": 1,
        "result": "fail",
        "expected_case_ids": [check_id],
        "executed_case_ids": [],
        "passed": 0,
        "failed": 1,
        "skipped": 0,
        "skip_reasons": [],
        "outputs": [],
        "limitations": [reason],
    }
    if ACTIVE_RUN is not None:
        payload.update(ACTIVE_RUN.subject(check_id))
        payload.update(coverage='slice', binding=ACTIVE_RUN.binding,
                       invocation_id=ACTIVE_RUN.invocation(check_id))
        payload['outputs'] = ACTIVE_RUN.outputs.get(check_id, [])
        if check_id == 'pack-library' and ACTIVE_RUN.pack_execution is not None:
            payload.update(evidence_origin='coordinator', prepack_binding=ACTIVE_RUN.pack_execution['binding'])
    else:
        payload['coverage'] = 'slice'
    report_path = reports / f"{check_id}.json"
    if report_path.is_file():
        # Do not overwrite an actual full child report with a process wrapper.
        # The evaluator checks the captured process exit independently.
        child = read_json(report_path)
        if child.get('coverage') == 'complete':
            return
        details = reports / 'details'
        details.mkdir(exist_ok=True)
        original = details / f'{check_id}-child.json'
        if original.exists():
            raise EvidenceError(f'duplicate child output for {check_id}')
        original.write_bytes(report_path.read_bytes())
        payload['outputs'] = [*payload.get('outputs', []), {
            'path': original.relative_to(run_dir).as_posix(),
            'sha256': evidence_sha256(original), 'bytes': original.stat().st_size,
        }]
    report_path.write_text(json.dumps(payload, indent=2) + "\n")


def write_check_report(
    run_dir: Path,
    run_id: str,
    line: str,
    check_id: str,
    *,
    exit_code: int,
    limitations: list[str] | None = None,
) -> None:
    reports = run_dir / "reports"
    reports.mkdir(parents=True, exist_ok=True)
    ok = exit_code == 0
    payload = {
        "schema_version": 1,
        "template": False,
        "run_id": run_id,
        "check_id": check_id,
        "line": line,
        "subject_kind": "artifact",
        "subject_ids": ["library"],
        "command": ["rc-verify.py", check_id],
        "exit_code": exit_code,
        "result": "pass" if ok else "fail",
        "expected_case_ids": [check_id],
        "executed_case_ids": [check_id],
        "passed": 1 if ok else 0,
        "failed": 0 if ok else 1,
        "skipped": 0,
        "skip_reasons": [],
        "outputs": [],
        "limitations": limitations or [],
    }
    if ACTIVE_RUN is not None:
        payload.update(ACTIVE_RUN.subject(check_id))
        payload.update(coverage='slice', binding=ACTIVE_RUN.binding,
                       invocation_id=ACTIVE_RUN.invocation(check_id))
        payload['outputs'] = ACTIVE_RUN.outputs.get(check_id, [])
        if check_id == 'pack-library' and ACTIVE_RUN.pack_execution is not None:
            payload.update(evidence_origin='coordinator', prepack_binding=ACTIVE_RUN.pack_execution['binding'])
    else:
        payload['coverage'] = 'slice'
    report_path = reports / f"{check_id}.json"
    if report_path.is_file():
        # Do not overwrite an actual full child report with a process wrapper.
        # The evaluator checks the captured process exit independently.
        child = read_json(report_path)
        if child.get('coverage') == 'complete':
            return
        details = reports / 'details'
        details.mkdir(exist_ok=True)
        original = details / f'{check_id}-child.json'
        if original.exists():
            raise EvidenceError(f'duplicate child output for {check_id}')
        original.write_bytes(report_path.read_bytes())
        payload['outputs'] = [*payload.get('outputs', []), {
            'path': original.relative_to(run_dir).as_posix(),
            'sha256': evidence_sha256(original), 'bytes': original.stat().st_size,
        }]
    report_path.write_text(json.dumps(payload, indent=2) + "\n")


def main() -> int:
    global ACTIVE_RUN
    ACTIVE_RUN = None
    if sys.argv[1:2] == ['--check-run']:
        return check_existing_run(sys.argv[2:])
    if sys.argv[1:] == ['--check-matrix']:
        validate_matrix(read_json(MATRIX_PATH))
        print('verify: matrix structure valid; no product checks executed')
        return 0
    out_dir, line = parse_args(sys.argv[1:])
    out_dir = out_dir.resolve()
    allowed_bases = ((ROOT / "artifacts").resolve(), Path(tempfile.gettempdir()).resolve())
    allowed = False
    for base in allowed_bases:
        try:
            relative_out = out_dir.relative_to(base)
            if str(relative_out) == '.':
                continue
            allowed = True
            break
        except ValueError:
            continue
    if not allowed:
        fail("--out must be under artifacts/ or the process temp directory")
    if out_dir.exists() and any(out_dir.iterdir()):
        fail(f"--out must be an empty or nonexisting directory: {out_dir}")
    out_dir.mkdir(parents=True, exist_ok=True)

    if not MATRIX_PATH.is_file():
        fail(f"missing full-verify matrix: {MATRIX_PATH}")
    matrix = read_json(MATRIX_PATH)
    required = list(validate_matrix(matrix).values())
    expected_matrix_digest = evidence_sha256(MATRIX_PATH)
    source_before_obs = observe_inputs(ROOT)
    source_before = source_before_obs['fingerprint']
    require_line_matches_checkout(line, source_before['line'])

    print("verify: packing once into", out_dir)
    pack_execution = execute_pack(out_dir, line, source_before, expected_matrix_digest)
    pack_code = pack_execution['exit_code']
    if pack_code != 0:
        fail(f"pack-draft failed ({pack_code})", code=pack_code or 1)

    run_path = out_dir / "run.json"
    meta_path = out_dir / "pack-meta.json"
    if not run_path.is_file() or not meta_path.is_file():
        fail("pack-draft did not write run.json / pack-meta.json")

    draft = read_json(run_path)
    run_id = draft.get('run_id')
    if run_id != pack_execution['run_id']:
        fail('pack manifest did not preserve the coordinator run identity')
    meta = json.loads(meta_path.read_text())
    tarball_name = meta.get("tarball")
    if not isinstance(tarball_name, str):
        fail("pack-meta.json missing tarball")
    tarball = out_dir / tarball_name
    if not tarball.is_file():
        fail(f"packed tarball missing: {tarball}")

    if draft.get('source', {}).get('commit') != source_before['commit'] or draft.get('source', {}).get('git_tree_sha') != source_before['tree'] or draft.get('source', {}).get('line') != line:
        fail('pack manifest source/tree/line does not match the selected checkout')
    draft['expected_matrix'] = {'path': 'compatibility/rc/matrices/full-verify.json', 'sha256': expected_matrix_digest}
    draft['execution_inputs'] = source_before
    pack_record_path = out_dir / 'pack-execution.json'
    draft['pack_execution'] = {'path': pack_record_path.name, 'sha256': evidence_sha256(pack_record_path),
                               'bytes': pack_record_path.stat().st_size}
    draft['pack_metadata'] = {'path': meta_path.name, 'sha256': evidence_sha256(meta_path),
                              'bytes': meta_path.stat().st_size}
    packed_obs = observe_inputs(ROOT)
    packed_drift = describe_input_drift(source_before_obs, packed_obs)
    if packed_drift or packed_obs['fingerprint'] != source_before:
        fail('source/checker inputs changed during packing\n' + '\n'.join(format_input_drift(packed_drift)))
    run_path.write_text(json.dumps(draft, indent=2) + '\n')
    ACTIVE_RUN = RunEvidence(draft, out_dir, expected_matrix_digest, pack_execution=pack_execution)
    # The pack child's exit stays in the execution record. Observation failures
    # keep this check incomplete without claiming the pack itself did not finish.
    pack_report_code = run_node("scripts/check-pack-library.mjs", ["--run", str(run_path)], record=False)
    pack_report_path = out_dir / "reports" / "pack-library.json"
    if pack_report_code != 0 and pack_report_path.is_file():
        observed = read_json(pack_report_path)
        if observed.get("coverage") == "complete":
            observed["coverage"] = "incomplete"
            observed["result"] = "fail"
            observed["exit_code"] = pack_report_code
            pack_report_path.write_text(json.dumps(observed, indent=2) + "\n")
    write_check_report(out_dir, run_id, line, "pack-library", exit_code=pack_report_code)

    results: dict[str, str] = {"pack-library": "pass" if pack_report_code == 0 else "fail"}
    implemented_ran: list[str] = ["pack-library"]

    # packed-exports
    code = run_node("scripts/check-packed-exports.mjs", ["--tarball", str(tarball)])
    write_check_report(out_dir, run_id, line, "packed-exports", exit_code=code)
    results["packed-exports"] = "pass" if code == 0 else "fail"
    implemented_ran.append("packed-exports")

    # packed-consumer (rehashes via --run)
    code = run_node("scripts/packed-consumer-aot-smoke.mjs", ["--run", str(run_path)])
    # packed-consumer writes its own report when --run is used; ensure index name.
    consumer_report = out_dir / "reports" / "packed-consumer.json"
    write_check_report(out_dir, run_id, line, "packed-consumer", exit_code=code)
    results["packed-consumer"] = "pass" if code == 0 else "fail"
    implemented_ran.append("packed-consumer")

    # motion-smoke is source-level today; record as implemented automatic check.
    code = run_node("scripts/motion-lifecycle-smoke.mjs", [])
    write_check_report(
        out_dir,
        run_id,
        line,
        "motion-smoke",
        exit_code=code,
        limitations=["Source/host motion smoke; not yet rebound as a packed-artifact subject."],
    )
    results["motion-smoke"] = "pass" if code == 0 else "fail"
    implemented_ran.append("motion-smoke")

    # engine-free-consumer: required consumer of the packed library bytes.
    code = run_node("scripts/engine-free-consumer.mjs", ["--tarball", str(tarball)])
    write_check_report(
        out_dir,
        run_id,
        line,
        "engine-free-consumer",
        exit_code=code,
        limitations=[
            "Installs declared peers without @angular/animations.",
            "Does not compile templates; not a sealed release certificate by itself.",
        ],
    )
    results["engine-free-consumer"] = "pass" if code == 0 else "fail"
    implemented_ran.append("engine-free-consumer")

    # migration-packaged: CLI artifact verify, isolation, the temp old workspace,
    # transaction cases the extracted CLI bin actually executes, frontend parity
    # between that CLI and ng generate, and packaged-schematic from that same
    # ng generate compared with expected_after. coverage stays slice. Every
    # 21.x migration group stays null, so this slice is not acceptance and does
    # not claim G04 or G05.
    code_verify = run_node("scripts/build-migrate-legacy-cli.mjs", ["--verify"])
    code_iso = run_node("scripts/migration-cli-isolation.mjs", [])
    code_workspace = run_node(
        "scripts/check-old-workspace-cli.mjs",
        ["--out", str(out_dir / "old-workspace-cli.json")],
    )
    code_tx = run_node(
        "scripts/migration-transaction.mjs",
        ["--out", str(out_dir / "migration-transaction.json")],
    )
    code_parity = run_node(
        "scripts/check-frontend-parity.mjs",
        ["--library-tarball", str(tarball), "--out", str(out_dir / "frontend-parity.json")],
    )
    code_schematic = run_node(
        "scripts/check-packaged-schematic.mjs",
        ["--library-tarball", str(tarball), "--out", str(out_dir / "packaged-schematic.json")],
    )
    code = 0 if code_verify == 0 and code_iso == 0 and code_workspace == 0 and code_tx == 0 and code_parity == 0 and code_schematic == 0 else (code_verify or code_iso or code_workspace or code_tx or code_parity or code_schematic or 1)
    write_check_report(
        out_dir,
        run_id,
        line,
        "migration-packaged",
        exit_code=code,
        limitations=[
            "Checks the committed migrate-legacy CLI tarball identity and isolation. That tarball is not old-workspace-cli acceptance.",
            "old-workspace-cli runs node on migration/dist/package/bin/migrate-legacy.js in a temp workspace installed from the sealed Material 16.2.14 environment.",
            "transaction-negatives runs node on package/bin/migrate-legacy.js extracted from that tarball. It does not import a transform function and does not run the schematic runner.",
            "Rostered transaction cases are blocked-file-writes-nothing, dry-apply-parity, second-apply-noop, concurrent-edit-rejected, and before-write-hook-refuses. The before-write refusal is MIGRATE_LEGACY_BEFORE_WRITE, not a production fault.",
            "An uncaught write error is not rostered when an earlier file remains rewritten.",
            "frontend-parity runs the extracted CLI bin and ng generate of the packed library collection on two copies of one temp fixture. It does not use an in-memory schematic host. That comparison stays a CLI byte match.",
            "packaged-schematic compares ng generate output with expected_after. It reuses the ng generate frontend from scripts/check-frontend-parity.mjs and does not define the roster as bytes matched the CLI. Every 21.x migration group stays null. coverage stays slice. Does not mark migration-packaged accepted. Does not claim G04 or G05.",
        ],
    )
    results["migration-packaged"] = "pass" if code == 0 else "fail"
    implemented_ran.append("migration-packaged")

    # sass-seal: peer-aware packed Sass isolation + sealed values + archived negative.
    code = run_node("scripts/sass-seal.mjs", ["--run", str(run_path)])
    write_check_report(
        out_dir,
        run_id,
        line,
        "sass-seal",
        exit_code=code,
        limitations=[
            "Peer-aware packed facade compile, three sealed value fixtures, archived @material import negative, mutated sealed-CSS negative, and the finite exact ordered-CSS fixtures.",
            "Does not execute sass-api-and-values, unresolved strict CSS diffs, DOM, or 21.x. Does not mark sass-seal accepted.",
            "Does not close companion bridge computed styles or G06-G08.",
        ],
    )
    results["sass-seal"] = "pass" if code == 0 else "fail"
    implemented_ran.append("sass-seal")

    # companion-bridge-tokens: compiled per-companion override token receipts (not G07).
    code = run_node("scripts/check-companion-bridges.mjs", [])
    write_check_report(
        out_dir,
        run_id,
        line,
        "companion-bridge-tokens",
        exit_code=code,
        limitations=[
            "Compiled token inventory only; no rendered computed styles.",
            "Does not claim G06-G08.",
        ],
    )
    results["companion-bridge-tokens"] = "pass" if code == 0 else "fail"
    implemented_ran.append("companion-bridge-tokens")

    # companion-computed-styles: Chromium rendered CSS-var slice (all 13 companions); not G07.
    code = run_node("scripts/check-companion-computed-styles.mjs", ["--run", str(run_path)])
    write_check_report(
        out_dir,
        run_id,
        line,
        "companion-computed-styles",
        exit_code=code,
        limitations=[
            "Rendered all 13 companion CSS custom-property rows on main/Chromium/zoneful only.",
            "Does not claim RC-05-A02 / G06-G08.",
        ],
    )
    results["companion-computed-styles"] = "pass" if code == 0 else "fail"
    implemented_ran.append("companion-computed-styles")

    # m3-coexistence: fresh main workspace compile of inclusion order plus the
    # nested/lazy/overlay and shared-style cases. The matrix implemented flag
    # stays false, and every 21.x m3 group stays null, so this slice is not
    # acceptance and does not claim G07.
    code = run_node(
        "scripts/check-m3-inclusion-order.mjs",
        ["--out", str(out_dir / "m3-inclusion-order-workspace.json")],
    )
    write_check_report(
        out_dir,
        run_id,
        line,
        "m3-coexistence",
        exit_code=code,
        limitations=[
            "Main workspace compiles the four inclusion orders, nested-theme-scope, lazy-body-overlay, and separate current/legacy shared-style scopes.",
            "Contamination fixtures are rejected and are not rostered.",
            "21.x m3 groups stay null. implemented stays false. Does not mark m3-coexistence accepted. Does not claim G07.",
        ],
    )
    results["m3-coexistence"] = "pass" if code == 0 else "fail"
    implemented_ran.append("m3-coexistence")

    # browser-matrix: Chromium dialog/select + overlay families (zoneful/zoneless) PR-slice; not the full matrix.
    code = run_node("scripts/run-browser-matrix-slice.mjs", ["--run", str(run_path)])
    write_check_report(
        out_dir,
        run_id,
        line,
        "browser-matrix",
        exit_code=code,
        limitations=[
            "Executes dialog/select (zoneful/zoneless/CSP/reduced-motion) plus menu/snack-bar/tooltip/autocomplete/tabs defaults; does not fan out to unexecuted cells.",
            "Firefox/WebKit, remaining families/states, SSR, enabled-motion, and other CSP remain not-executed.",
            "Does not claim G10.",
        ],
    )
    results["browser-matrix"] = "pass" if code == 0 else "fail"
    implemented_ran.append("browser-matrix")

    # native-motion: packed artifact on Chromium, Firefox, and WebKitGTK.
    # WebKitGTK is the webkit engine only. motion-smoke stays source-level.
    code = run_node("scripts/native-motion-acceptance.mjs", ["--run", str(run_path)])
    write_check_report(
        out_dir,
        run_id,
        line,
        "native-motion",
        exit_code=code,
        limitations=[
            "Artifact-native motion on Chromium, Firefox, and WebKitGTK. WebKitGTK is not Safari.",
            "Does not claim G04 or G10.",
        ],
    )
    results["native-motion"] = "pass" if code == 0 else "fail"
    implemented_ran.append("native-motion")

    # csp-ssr: Chromium nonce/hash policy and dom-free server renders.
    # WebKitGTK is not Safari and is not launched here. Hydration is unclaimed.
    code = run_node("scripts/csp-ssr-acceptance.mjs", ["--run", str(run_path)])
    write_check_report(
        out_dir,
        run_id,
        line,
        "csp-ssr",
        exit_code=code,
        limitations=[
            "Chromium CSP nonce and style hash. No unsafe-inline. WebKitGTK is not Safari and is not this check.",
            "Server imports and renders start without a document. Hydration is unclaimed.",
            "Does not claim G04 or G10.",
        ],
    )
    results["csp-ssr"] = "pass" if code == 0 else "fail"
    implemented_ran.append("csp-ssr")

    # api-completeness: packed vs 16.2.14 names + allowlist + structural signatures.
    code = run_node("scripts/api-completeness.mjs", ["--run", str(run_path)])
    write_check_report(
        out_dir,
        run_id,
        line,
        "api-completeness",
        exit_code=code,
        limitations=[
            "Export-name completeness vs Material 16.2.14 with reviewed allowlist.",
            "Structural member-name signatures for shared class/interface exports.",
            "Does not claim G02 (full overload/generics/protected/DI identity).",
        ],
    )
    results["api-completeness"] = "pass" if code == 0 else "fail"
    implemented_ran.append("api-completeness")

    # historical-legacy-artifact: all inventory families against the packed --run.
    code = run_node("scripts/rc-test-legacy-family.mjs", ["--run", str(run_path)])
    write_check_report(
        out_dir,
        run_id,
        line,
        "historical-legacy-artifact",
        exit_code=code,
        limitations=[
            "Runs the inventory family suite against the rehashed packed library.",
            "Requires a usable Chromium/Chrome (CHROME_BIN).",
            "Passing this cell alone is not G09 or G01 closure.",
        ],
    )
    results["historical-legacy-artifact"] = "pass" if code == 0 else "fail"
    implemented_ran.append("historical-legacy-artifact")

    # FRESH-03 producers. Nonzero means the admission gap is still open.
    # A structural ledger pass is not security clearance and is not copied forward.
    code = run_node(
        "scripts/check-upstream-audit-disposition.mjs",
        ["--admission", "--line", line, "--report", str(out_dir / "upstream-audit-structural.json")],
    )
    write_check_report(
        out_dir, run_id, line, "upstream-audit-disposition", exit_code=code,
        limitations=[
            "Structural seed coverage is not disposition admission or security clearance.",
            "Sensitive, inherited, and material behavior rows still lack individual proof; the symbol seed is open.",
            "This check does not query advisories. g11_claim stays not-passed.",
        ],
    )
    results["upstream-audit-disposition"] = "pass" if code == 0 else "fail"
    implemented_ran.append("upstream-audit-disposition")

    code = run_node(
        "scripts/check-source-policy.py",
        ["--root", "projects/ngx-material-legacy", "--tarball", str(tarball),
         "--report", str(out_dir / "source-policy-observation.json")],
    )
    write_check_report(
        out_dir, run_id, line, "source-policy", exit_code=code,
        limitations=[
            "Installed peer annotation comparison is unknown unless declaration files from node_modules/@angular are present.",
            "Owned helpers replace animations-module imports, deep private modules, and underscore platform imports. A packed digest is still scanned separately.",
        ],
    )
    results["source-policy"] = "pass" if code == 0 else "fail"
    implemented_ran.append("source-policy")

    code = run_node(
        "scripts/check-dependency-eligibility.py",
        ["--lookup", "--report", str(out_dir / "dependency-eligibility-observation.json")],
    )
    write_check_report(
        out_dir, run_id, line, "dependency-eligibility", exit_code=code,
        limitations=[
            "This run queries OSV and registry publish times. A non-200, stale, truncated, or missing-time result stays unknown.",
            "HTTP 200 metadata is not security clearance. Unresolved findings and packages younger than seven days block the check.",
            "Vendor hash and license-file observations do not clear G08, G11, or G13. g11_claim stays not-passed.",
        ],
    )
    results["dependency-eligibility"] = "pass" if code == 0 else "fail"
    implemented_ran.append("dependency-eligibility")

    # consumer-floors: library engines/peers, the migrate CLI runtime, and --line isolation.
    # The matrix implemented flag stays false. Every 21.x group stays null, so this
    # check stays incomplete and does not claim G12.
    code = run_node(
        "scripts/check-consumer-floors.mjs",
        ["--out", str(out_dir / "consumer-floors-workspace.json")],
    )
    write_check_report(
        out_dir,
        run_id,
        line,
        "consumer-floors",
        exit_code=code,
        limitations=[
            "Compares advertised library engines.node and peerDependencies to lock/installed versions.",
            "Library Node floor uses toolchain-lock.json / .node-version, not process.version.",
            "cli-runtime executes the migrate CLI on the current Node and rejects 17.0.0 by the CLI engines range. The current runtime is not recorded as a Node 18 floor run.",
            "line-isolation maps this checkout library version to main and rejects --line 21.x. It is not a 21.x checkout run.",
            "21.x consumer-floors groups stay null. Does not mark consumer-floors accepted. Does not claim G12.",
        ],
    )
    results["consumer-floors"] = "pass" if code == 0 else "fail"
    implemented_ran.append("consumer-floors")

    # release-metadata: declared name/version/license/provenance only.
    # The matrix implemented flag stays false. 21.x groups stay null, so this
    # slice is not acceptance and does not claim G01 or G13.
    code = run_node(
        "scripts/check-release-metadata.mjs",
        ["--out", str(out_dir / "release-metadata-workspace.json")],
    )
    write_check_report(
        out_dir,
        run_id,
        line,
        "release-metadata",
        exit_code=code,
        limitations=[
            "Compares declared library and migrate-cli name, version, and license fields, plus the existing provenance file.",
            "instructions-provenance rosters only provenance fields that were compared. No instruction file was compared.",
            "21.x release-metadata groups stay null. Does not mark release-metadata accepted. Does not claim G01 or G13.",
        ],
    )
    results["release-metadata"] = "pass" if code == 0 else "fail"
    implemented_ran.append("release-metadata")

    missing: list[str] = []
    failed: list[str] = []
    for check in required:
        check_id = check.get("check_id")
        if not isinstance(check_id, str) or not check_id:
            fail("full-verify matrix has a check without check_id")
        if check_id in results:
            if results[check_id] != "pass":
                failed.append(check_id)
            continue
        if not check.get("implemented"):
            write_missing_report(
                out_dir,
                run_id,
                line,
                check_id,
                f"Required check {check_id} is not implemented in automatic verify yet.",
            )
            missing.append(check_id)
            results[check_id] = "missing"
            continue
        # Marked implemented but no runner wired here — still fail closed.
        write_missing_report(
            out_dir,
            run_id,
            line,
            check_id,
            f"Required check {check_id} is marked implemented but was not invoked.",
        )
        missing.append(check_id)
        results[check_id] = "missing"

    record = {
        'schema_version': 1, 'run_id': run_id, 'binding': ACTIVE_RUN.binding,
        'invocation_ids': ACTIVE_RUN.invocations, 'process_results': ACTIVE_RUN.exit_codes,
        'recorded_at': datetime.now(timezone.utc).isoformat(),
    }
    record_path = out_dir / 'execution-record.json'
    record_path.write_text(json.dumps(record, indent=2) + '\n')
    draft['execution_record'] = {'path': record_path.name, 'sha256': evidence_sha256(record_path), 'bytes': record_path.stat().st_size}
    run_path.write_text(json.dumps(draft, indent=2) + '\n')
    completeness = evaluate_run(ROOT, run_path, matrix_sha256=expected_matrix_digest,
        binding=ACTIVE_RUN.binding, process_results=ACTIVE_RUN.exit_codes,
        invocation_ids=ACTIVE_RUN.invocations)
    source_after_obs = observe_inputs(ROOT)
    source_drift = describe_input_drift(source_before_obs, source_after_obs)
    (out_dir / 'source-inputs.json').write_text(json.dumps({
        'schema_version': 1,
        'role': 'source input observation',
        'run_id': run_id,
        'before': {'fingerprint': source_before, 'locks': source_before_obs['locks']},
        'after': {'fingerprint': source_after_obs['fingerprint'], 'locks': source_after_obs['locks']},
        'changes': source_drift,
    }, indent=2) + '\n')
    if source_drift or source_after_obs['fingerprint'] != source_before:
        named = format_input_drift(source_drift) or ['source, checker or tool inputs changed during execution']
        completeness['incomplete_checks']['source-drift'] = named
        completeness['automatic_product_result'] = 'incomplete'
        print('verify: source drift\n' + '\n'.join(named), file=sys.stderr)
    summary = {
        "schema_version": 1,
        "role": "rc-verify-orchestration",
        "run_id": run_id,
        "line": line,
        "out": str(out_dir),
        "matrix": str(MATRIX_PATH.relative_to(ROOT)),
        "implemented_ran": implemented_ran,
        "results": results,
        "completeness": completeness,
        "missing_required": missing,
        "failed_required": failed,
        "g01_claimed": False,
        "g_gates_claimed": [],
        "finished_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "limitations": [
            "Incremental RC-02.04 orchestration only.",
            "Missing required matrix cells keep this gate failed.",
            "Does not claim G01-G13 or RC engineering ready.",
        ],
    }
    (out_dir / "verify-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    archive_error = ''
    try:
        write_closure(out_dir)
    except ClosureError as error:
        archive_error = str(error)
        print(f'verify: {archive_error}', file=sys.stderr)

    print("verify: implemented checks:", ", ".join(implemented_ran))
    if missing:
        print("verify: missing required checks:")
        for item in missing:
            print(f"  - {item}")
    if failed:
        print("verify: failed required checks:")
        for item in failed:
            print(f"  - {item}")
    print("verify: this command did not claim G01-G13")
    # Keep a stable phrase so older tooling can detect non-success subsets:
    print("verify: did not run verify-lite or any historical family as a stand-in for omitted product gates")

    for cid, reasons in completeness['incomplete_checks'].items():
        print(f"verify: incomplete {cid}: {reasons[0]}")
    if archive_error or missing or failed or completeness['automatic_product_result'] != 'pass':
        return 2
    print('verify: automatic prerequisites complete; independent review and release admission remain pending')
    return 0


if __name__ == "__main__":
    try:
        if '--out' in sys.argv[1:]:
            with verifier_lock(ROOT):
                raise SystemExit(main())
        raise SystemExit(main())
    except (EvidenceError, OSError, ValueError, subprocess.CalledProcessError) as error:
        print(f'verify: {error}', file=sys.stderr)
        raise SystemExit(2)
