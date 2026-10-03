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
    "scripts/build-migrate-legacy-cli.mjs": "migration-packaged",
    "scripts/migration-cli-isolation.mjs": "migration-packaged",
    "scripts/rc-test-legacy-family.mjs": "historical-legacy-artifact",
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
            # The current slice only checks the independent CLI. The full
            # contract also requires the library's packaged schematic.
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


def source_fingerprint(root):
    """Detect source/tool/test changes during execution; no synthetic Git fallback."""
    def git(*args):
        result = subprocess.run(['git', *args], cwd=root, capture_output=True, check=True)
        return result.stdout
    commit = git('rev-parse', 'HEAD').decode().strip()
    tree = git('rev-parse', 'HEAD^{tree}').decode().strip()
    names = git('ls-files', '-z').decode().split('\0')
    digest = hashlib.sha256()
    for name in sorted(filter(None, names)):
        if name.startswith('compatibility/rc/reports/'):
            continue  # Legacy generated outputs, not the contract/runner inputs.
        path = root / name
        digest.update(name.encode() + b'\0')
        if path.is_symlink():
            digest.update(b'link:' + os.readlink(path).encode())
        else:
            digest.update(str(path.stat().st_mode).encode() + b'\0' + path.read_bytes())
    status = git('status', '--porcelain', '--untracked-files=all', '--', '.', ':(exclude)compatibility/rc/reports')
    digest.update(status)
    package = read_json(root / 'projects/ngx-material-legacy/package.json')
    version = package.get('version', '')
    major = version.split('.', 1)[0] if isinstance(version, str) else ''
    if major not in ('21', '22'):
        raise EvidenceError('cannot determine the supported source line from library version')
    return {'commit': commit, 'tree': tree, 'inputs_sha256': digest.hexdigest(),
            'clean': not status.strip(), 'line': '21.x' if major == '21' else 'main'}



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
    if source_fingerprint(ROOT) != run.get('execution_inputs'):
        fail('source/checker inputs differ from the recorded execution')
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
    source_before = source_fingerprint(ROOT)
    if source_before['line'] != line:
        fail('--line does not match this checkout library version')

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
    if source_fingerprint(ROOT) != source_before:
        fail('source/checker inputs changed during packing')
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

    # migration-packaged: committed peer-light CLI artifact verify + isolation.
    code_verify = run_node("scripts/build-migrate-legacy-cli.mjs", ["--verify"])
    code_iso = run_node("scripts/migration-cli-isolation.mjs", [])
    code = 0 if code_verify == 0 and code_iso == 0 else (code_verify or code_iso or 1)
    write_check_report(
        out_dir,
        run_id,
        line,
        "migration-packaged",
        exit_code=code,
        limitations=[
            "Checks the committed migrate-legacy CLI tarball identity and isolation.",
            "CLI identity is the committed migration/dist tarball; draft run.json records it as migrate-cli when present.",
            "Schematic runner / old-workspace migration fixtures remain separate.",
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
            "Peer-aware packed facade compile, three sealed value fixtures, archived @material negative.",
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
            "Authored animations imports, private namespace members, and deep internal modules remain.",
            "Installed peer annotation comparison is unknown unless declaration files are present, and a clean packed digest does not erase authored failures.",
        ],
    )
    results["source-policy"] = "pass" if code == 0 else "fail"
    implemented_ran.append("source-policy")

    code = run_node(
        "scripts/check-dependency-eligibility.py",
        ["--report", str(out_dir / "dependency-eligibility-observation.json")],
    )
    write_check_report(
        out_dir, run_id, line, "dependency-eligibility", exit_code=code,
        limitations=[
            "No advisory lookup was performed by this run. Stored http status is not a current result.",
            "Lock packages absent from the stored direct-pin query, toolchain age, unresolved findings, and vendor advisories stay unknown.",
            "Vendor hash and license-file observations do not clear G08, G11, or G13.",
        ],
    )
    results["dependency-eligibility"] = "pass" if code == 0 else "fail"
    implemented_ran.append("dependency-eligibility")

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
    if source_fingerprint(ROOT) != source_before:
        completeness['incomplete_checks']['source-drift'] = ['source, checker or tool inputs changed during execution']
        completeness['automatic_product_result'] = 'incomplete'
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
    if missing or failed or completeness['automatic_product_result'] != 'pass':
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
