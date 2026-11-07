"""Synthetic local-Git fixtures validate manifests; no release build is claimed."""
from __future__ import annotations
import ast
import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import rc_acceptance as acceptance
from test_rc_acceptance import CompleteFixture, write_json


def copy_verifier_fixture_scripts(root):
    """Copy the real local Python import closure needed by the copied coordinator."""
    pending = ['rc-verify.py']
    copied = set()
    while pending:
        name = pending.pop()
        if name in copied:
            continue
        source = ROOT / 'scripts' / name
        copied.add(name)
        shutil.copy2(source, root / 'scripts' / name)
        tree = ast.parse(source.read_text())
        for node in ast.walk(tree):
            modules = ([node.module] if isinstance(node, ast.ImportFrom) and node.module else
                       [alias.name for alias in node.names] if isinstance(node, ast.Import) else [])
            for module in modules:
                dependency = module.split('.')[0] + '.py'
                if (ROOT / 'scripts' / dependency).is_file() and dependency not in copied:
                    pending.append(dependency)


    # The imported admission modules load finite source and reference data at
    # import time; copy literal in-repository dependencies and JSON references.
    pending_paths = []
    for name in copied:
        tree = ast.parse((ROOT / 'scripts' / name).read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                value = node.value
                if value.startswith(('fixtures/sass/', 'reference/material-16.2.14/', 'compatibility/rc/', 'projects/ngx-material-legacy/', 'tests/fixtures/stepper-material-16/')):
                    pending_paths.append(value)
    seen = set()
    while pending_paths:
        relative = pending_paths.pop()
        if relative in seen or '..' in Path(relative).parts or relative.startswith('compatibility/rc/reports/'):
            continue
        seen.add(relative)
        source = ROOT / relative
        if not source.is_file():
            continue
        target = root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            shutil.copy2(source, target)
        if source.suffix == '.json':
            def references(value):
                if isinstance(value, dict):
                    for item in value.values(): references(item)
                elif isinstance(value, list):
                    for item in value: references(item)
                elif isinstance(value, str) and value.startswith(('fixtures/sass/', 'reference/material-16.2.14/', 'compatibility/rc/', 'projects/ngx-material-legacy/', 'tests/fixtures/stepper-material-16/')):
                    pending_paths.append(value)
            references(json.loads(source.read_bytes()))


def initialize_git(root):
    env = {**os.environ, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null'}
    def git(*args):
        return subprocess.run(['git', *args], cwd=root, env=env, capture_output=True, text=True, check=True).stdout.strip()
    git('init', '-q')
    git('config', 'user.name', 'Synthetic verifier test')
    git('config', 'user.email', 'synthetic@example.invalid')
    git('config', 'core.hooksPath', '/dev/null')
    (root / '.gitignore').write_text('/artifacts/\n/node_modules/\n__pycache__/\n')
    git('add', '.')
    git('commit', '-qm', 'Synthetic verifier fixture')
    return git


@unittest.skipUnless(shutil.which('node') and shutil.which('git'), 'Node and Git are needed')
class WriterFixture(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='rc-writer-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'scripts').mkdir()
        for name in ('write-draft-run.mjs', 'seal-draft-run.mjs'):
            shutil.copy2(ROOT / 'scripts' / name, self.root / 'scripts' / name)
        write_json(self.root / 'compatibility/rc/matrices/pack-draft.json', {
            'schema_version': 1, 'id': 'pack-draft', 'checks': [{'check_id': 'packed-consumer', 'required': True}]})
        write_json(self.root / 'compatibility/provenance.json', {'baseline_tag': '16.2.14', 'baseline_full_commit': 'a' * 40})
        write_json(self.root / 'package.json', {'devDependencies': {'@angular/core': '22.1.7', '@angular/cdk': '22.1.7', '@angular/material': '22.1.7'}})
        (self.root / 'chainman.lock').write_text('b' * 40 + '\n')
        (self.root / 'pnpm-lock.yaml').write_text('synthetic lock\n')
        write_json(self.root / 'toolchain-lock.json', {'synthetic': True})
        self.cli = self.root / 'migration/dist/ngx-compat-material-legacy-migrate-cli-22.0.0-rc.0.tgz'
        self.cli.parent.mkdir(parents=True)
        self.cli.write_bytes(b'synthetic cli bytes')
        initialize_git(self.root)
        self.run_dir = self.root / 'artifacts/test'
        self.run_dir.mkdir(parents=True)
        self.tarball = self.run_dir / 'library.tgz'
        self.tarball.write_bytes(b'synthetic library bytes')
        self.run_path = self.run_dir / 'run.json'
        self.bin = Path(self.temp.name) / 'artifacts/tools'
        self.bin.mkdir(parents=True)
        for name in ('pnpm', 'npm'):
            p = self.bin / name
            p.write_text('#!/bin/sh\nprintf "synthetic-version\\n"\n')
            p.chmod(0o755)
        self.env = {**os.environ, 'PATH': str(self.bin) + os.pathsep + os.environ['PATH']}

    def invoke(self, name, *args):
        return subprocess.run(['node', 'scripts/' + name, *args], cwd=self.root, env=self.env,
                              capture_output=True, text=True, timeout=15)

    def write_run(self):
        result = self.invoke('write-draft-run.mjs', '--tarball', str(self.tarball), '--line', 'main', '--out', str(self.run_dir))
        self.assertEqual(result.returncode, 0, result.stderr)
        return acceptance.read_json(self.run_path)

    def successful_slice_report(self, run):
        write_json(self.run_dir / 'reports/packed-consumer.json', {
            'schema_version': 1, 'template': False, 'run_id': run['run_id'], 'line': 'main',
            'check_id': 'packed-consumer', 'subject_kind': 'artifact', 'artifact': run['artifacts'][0],
            'result': 'pass', 'exit_code': 0, 'failed': 0,
        })



@unittest.skipUnless(shutil.which('node') and shutil.which('git'), 'Node and Git are needed')
class WriterSealerTests(WriterFixture):
    def test_writer_copies_cli_under_run_root_with_distinct_identity(self):
        run = self.write_run()
        cli = next(a for a in run['artifacts'] if a['id'] == 'migrate-cli')
        p = acceptance.checked_file(self.run_dir, cli, 'CLI')
        self.assertEqual(p.read_bytes(), self.cli.read_bytes())
        self.assertEqual(cli['path'], 'inputs/migrate-cli.tgz')
        self.assertNotEqual(cli['sha256'], run['artifacts'][0]['sha256'])

    def test_writer_does_not_invent_host_nix_without_environment(self):
        self.env.pop('CHAINMAN_MODE', None)
        run = self.write_run()
        self.assertEqual(run['environment']['mode'], 'unqualified-host')

    def test_expected_full_matrix_cannot_be_downgraded_to_slice(self):
        run = self.write_run()
        self.successful_slice_report(run)
        result = self.invoke('seal-draft-run.mjs', '--run', str(self.run_path),
            '--expected-matrix-sha256', run['expected_matrix']['sha256'])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('downgraded', result.stderr)

    def test_writer_refuses_existing_run_without_changing_bytes(self):
        self.write_run()
        old = self.run_path.read_bytes()
        result = self.invoke('write-draft-run.mjs', '--tarball', str(self.tarball), '--line', 'main', '--out', str(self.run_dir))
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.run_path.read_bytes(), old)

    def test_slice_seal_still_works_and_leaves_admission_pending(self):
        run = self.write_run()
        self.successful_slice_report(run)
        result = self.invoke('seal-draft-run.mjs', '--run', str(self.run_path))
        self.assertEqual(result.returncode, 0, result.stderr)
        sealed = acceptance.read_json(self.run_path)
        self.assertEqual(sealed['stage'], 'sealed')
        self.assertEqual(sealed['summary']['required_review_state'], 'pending')
        self.assertEqual(sealed['summary']['engineering_admission'], 'not-decided')
        sidecar = Path(str(self.run_path) + '.sha256').read_text().split()[0]
        self.assertEqual(sidecar, acceptance.sha256_file(self.run_path))

    def test_post_test_artifact_tamper_blocks_seal(self):
        run = self.write_run()
        self.successful_slice_report(run)
        before = self.run_path.read_bytes()
        self.tarball.write_bytes(b'tampered-after-tests')
        result = self.invoke('seal-draft-run.mjs', '--run', str(self.run_path))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('changed after verification', result.stderr)
        self.assertEqual(self.run_path.read_bytes(), before)

    def test_cli_tamper_blocks_seal_independently(self):
        run = self.write_run()
        self.successful_slice_report(run)
        (self.run_dir / 'inputs/migrate-cli.tgz').write_bytes(b'tampered-cli')
        result = self.invoke('seal-draft-run.mjs', '--run', str(self.run_path))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('migrate-cli changed', result.stderr)


@unittest.skipUnless(shutil.which('node') and shutil.which('git'), 'Node and Git are needed')
class FullSealerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='rc-full-sealer-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.f = CompleteFixture(self.root)
        (self.root / 'scripts').mkdir()
        copy_verifier_fixture_scripts(self.root)
        shutil.copy2(ROOT / 'scripts/seal-draft-run.mjs', self.root / 'scripts/seal-draft-run.mjs')
        from typeahead_sealer_fixture import prepare
        prepare(self.f)
        git = initialize_git(self.root)
        spec = importlib.util.spec_from_file_location('synthetic_verify_source', self.root / 'scripts/rc-verify.py')
        verify = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(verify)
        fp = verify.source_fingerprint(self.root)
        self.f.run['source'].update(commit=git('rev-parse', 'HEAD'), git_tree_sha=git('rev-parse', 'HEAD^{tree}'))
        self.f.run['execution_inputs'] = fp
        self.f.run['reports'] = []
        self.f.write_pack_record()
        self.f.binding = acceptance.binding_for(self.f.run, self.f.matrix_sha)
        for cid, report in self.f.reports.items():
            report['binding'] = self.f.binding
            if cid == 'pack-library':
                report['prepack_binding'] = self.f.pack_record['binding']
            self.f.save_report(cid)
        self.record_path = self.f.run_dir / 'execution-record.json'
        self.save_record()
        from typeahead_sealer_fixture import complete
        complete(self.f)
        self.save_record()

    def save_record(self):
        write_json(self.record_path, {'schema_version': 1, 'run_id': self.f.run['run_id'],
            'binding': self.f.binding, 'process_results': self.f.exits, 'invocation_ids': self.f.invocations})
        self.f.run['execution_record'] = {'path': self.record_path.name, 'bytes': self.record_path.stat().st_size,
                                          'sha256': acceptance.sha256_file(self.record_path)}
        write_json(self.f.run_path, self.f.run)

    def seal(self, expected=True):
        args = ['node', 'scripts/seal-draft-run.mjs', '--run', str(self.f.run_path)]
        if expected:
            args += ['--expected-matrix-sha256', self.f.matrix_sha]
        return subprocess.run(args, cwd=self.root, capture_output=True, text=True, timeout=15)

    def test_full_seal_requires_caller_matrix_identity(self):
        result = self.seal(False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('--expected-matrix-sha256', result.stderr)

    def test_full_seal_uses_completeness_not_just_report_exit_codes(self):
        self.f.reports['browser-matrix']['coverage'] = 'slice'
        self.f.save_report('browser-matrix')
        before = self.f.run_path.read_bytes()
        result = self.seal()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('passing slice', result.stderr)
        self.assertEqual(self.f.run_path.read_bytes(), before)

    def test_complete_synthetic_evidence_can_seal_but_cannot_authorize_release(self):
        result = self.seal()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        run = acceptance.read_json(self.f.run_path)
        self.assertEqual(run['summary']['required_review_state'], 'pending')
        self.assertEqual(run['summary']['engineering_admission'], 'not-decided')
        self.assertEqual(len(run['reports']), len(acceptance.CHECK_CONTRACT))

    def test_failed_execution_record_cannot_be_rescued_by_reports(self):
        self.f.exits['browser-matrix'] = 7
        self.save_record()
        result = self.seal()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('child failed', result.stderr)

    def test_checker_source_change_invalidates_seal(self):
        p = self.root / 'scripts/rc_acceptance.py'
        p.write_text(p.read_text() + '\n# synthetic input mutation\n')
        result = self.seal()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('inputs differ', result.stderr)

    def test_bad_execution_record_digest_is_rejected(self):
        self.record_path.write_text('{}')
        result = self.seal()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('bytes/hash mismatch', result.stderr)

    def seal_with_post_evaluation_change(self, action):
        # An external process wrapper mutates evidence after the REAL evaluator
        # returns, without test-only hooks in production code.
        tools = self.f.run_dir / 'test-tools'
        tools.mkdir()
        wrapper = tools / 'python3'
        wrapper.write_text('#!' + sys.executable + '\n' +
            'import json,sys,subprocess\nfrom pathlib import Path\n' +
            'child=subprocess.run([' + repr(sys.executable) + ',*sys.argv[1:]],capture_output=True,text=True)\n' +
            'if child.returncode != 0:\n sys.stdout.write(child.stdout); sys.stderr.write(child.stderr); sys.exit(child.returncode)\n' +
            'data=json.loads(child.stdout)\n' + action + '\n' +
            'sys.stdout.write(json.dumps(data)); sys.exit(0)\n')
        wrapper.chmod(0o755)
        env = {**os.environ, 'PATH': str(tools) + os.pathsep + os.environ['PATH']}
        before = self.f.run_path.read_bytes()
        result = subprocess.run(['node', 'scripts/seal-draft-run.mjs', '--run', str(self.f.run_path),
                                 '--expected-matrix-sha256', self.f.matrix_sha],
                                cwd=self.root, env=env, capture_output=True, text=True, timeout=15)
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(self.f.run_path.read_bytes(), before)
        self.assertFalse(Path(str(self.f.run_path) + '.sha256').exists())
        self.assertFalse(Path(str(self.f.run_path) + '.sealing').exists())
        return result

    def test_late_tracked_source_change_blocks_seal(self):
        path = self.root / '.gitignore'
        result = self.seal_with_post_evaluation_change(f'p=Path({str(path)!r}); p.write_text(p.read_text()+"# late tracked change\\n")')
        self.assertIn('Source checkout changed before sealing', result.stderr)

    def test_late_untracked_source_blocks_seal(self):
        path = self.root / 'late-source.ts'
        result = self.seal_with_post_evaluation_change(f'Path({str(path)!r}).write_text("late untracked source")')
        self.assertIn('Source checkout changed before sealing', result.stderr)

    def test_assertion_mutation_after_evaluator_blocks_seal(self):
        path = self.f.run_dir / self.f.reports['packed-consumer']['outputs'][0]['path']
        result = self.seal_with_post_evaluation_change(f'p=Path({str(path)!r}); p.write_bytes(b"X" * p.stat().st_size)')
        self.assertIn('Validated evidence changed after evaluation', result.stderr)

    def test_execution_record_mutation_after_evaluator_blocks_seal(self):
        result = self.seal_with_post_evaluation_change(f'p=Path({str(self.record_path)!r}); p.write_bytes(b"X" * p.stat().st_size)')
        self.assertIn('Validated evidence changed after evaluation', result.stderr)

    def test_pack_record_mutation_after_evaluator_blocks_seal(self):
        path = self.f.run_dir / 'pack-execution.json'
        result = self.seal_with_post_evaluation_change(f'p=Path({str(path)!r}); p.write_text("tampered")')
        self.assertIn('Validated evidence changed after evaluation', result.stderr)

    def test_pack_metadata_mutation_after_evaluator_blocks_seal(self):
        path = self.f.run_dir / 'pack-meta.json'
        result = self.seal_with_post_evaluation_change(f'p=Path({str(path)!r}); p.write_text("tampered")')
        self.assertIn('Validated evidence changed after evaluation', result.stderr)

    def test_matrix_mutation_after_evaluator_blocks_seal(self):
        result = self.seal_with_post_evaluation_change(f'p=Path({str(self.f.matrix_path)!r}); p.write_text("tampered")')
        self.assertIn('Validated evidence changed after evaluation', result.stderr)

    def test_same_bytes_symlink_replacement_after_evaluator_blocks_seal(self):
        path = self.f.run_dir / self.f.reports['packed-consumer']['outputs'][0]['path']
        other = path.with_name('same-bytes.txt')
        result = self.seal_with_post_evaluation_change(f'p=Path({str(path)!r}); other=Path({str(other)!r}); p.rename(other); p.symlink_to(other)')
        self.assertIn('symlinked validated evidence', result.stderr)

    def test_omitted_assertion_snapshot_blocks_seal(self):
        result = self.seal_with_post_evaluation_change("data['validated_files'] = [r for r in data['validated_files'] if not r['path'].startswith('evidence/packed-consumer/')]")
        self.assertIn('omitted a required validated evidence file', result.stderr)

    def test_duplicate_snapshot_entry_blocks_seal(self):
        result = self.seal_with_post_evaluation_change("data['validated_files'].append(data['validated_files'][0])")
        self.assertIn('Duplicate or unexpected validated evidence identity', result.stderr)

    def test_full_seal_retains_nonselfreferential_evidence_inventory(self):
        old_digest = acceptance.sha256_file(self.f.run_path)
        result = self.seal()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        sealed = acceptance.read_json(self.f.run_path)
        self.assertEqual(sealed['preseal_manifest_sha256'], old_digest)
        self.assertTrue(sealed['evidence_files'])
        self.assertFalse(any(r['root'] == 'run' and r['path'] == 'run.json' for r in sealed['evidence_files']))
        self.assertTrue(any(r['path'] == 'execution-record.json' for r in sealed['evidence_files']))
        self.assertTrue(any(r['path'].startswith('evidence/') for r in sealed['evidence_files']))


@unittest.skipUnless(shutil.which('node') and shutil.which('git'), 'Node and Git are needed')
class CoordinatorEntryTests(WriterFixture):
    """Exercise the real coordinator CLI with explicitly synthetic product children."""

    def setUp(self):
        super().setUp()
        copy_verifier_fixture_scripts(self.root)
        # Exercise the real source-inventory preflight against the actual finite
        # tagged roster and its bound candidate and shim bytes.
        inventory = acceptance.read_json(ROOT / 'testing/legacy-runner/historical-inventory.json')
        inventory_paths = {'testing/legacy-runner/historical-inventory.json',
                           'testing/legacy-runner/historical-specs.json',
                           'compatibility/handoff/codex-closeout/reference/historical-paths.csv'}
        inventory_paths.update(row['candidate'] for row in inventory['rows'])
        inventory_paths.update(row['path'] for row in inventory['shared_suite_shims'])
        for relative in inventory_paths:
            destination = self.root / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / relative, destination)
        # Synthetic-only rebinding: the retained checkout inventory is not edited.
        expected = {
          'legacy-autocomplete/autocomplete.spec.ts': 'abc2ec1a6ceeb69b2410eb9827dabf3623e6592c035ec3b19f17321bf3b85a09',
          'legacy-chips/chip-list.spec.ts': 'b41c1b2911e20ffa95853e5ec438b3c684919ce920129429f76dabadc206cbe2',
          'legacy-dialog/dialog.spec.ts': 'd1938bb0ab51a94fc7dc1e4d0f28d9e08f5280492565a9577f0db08b39b4b985',
          'legacy-input/input.spec.ts': '025f4fa2579ce0d93e95dc7cfe266081d3d0d771bb31c9ccc71ff8970c478eae',
          'legacy-menu/menu.spec.ts': 'fefc0509a3c6597aa78b68ec885a14f9c4eae5f8d0742d8055b1fdc4e5f4ce0a',
          'legacy-select/select.spec.ts': 'cad39a56a0e7843734ecfaf0454d6cbf91bba63501a09402cf9d6bcf31484cd7',
          'legacy-snack-bar/snack-bar.spec.ts': '92425afa5ddcb406c75b4af69ea9dd795f3b3d10ef8898b909a7bd1ad69f7230',
          'legacy-table/table.spec.ts': '6987ae268b614e3d445852fe9eb99e05d1f7c6c5669505079ed142586ab47d1e',
          'legacy-tabs/tab-group.spec.ts': 'fbe51f8fd03841b2dbef0f5b814148edd97a7188a2de803835ce17064afc1145',
        }
        retained = {
          'legacy-autocomplete/autocomplete.spec.ts': '2610d311569c9a6fdb063dc0652b423414622cf1370b2434f13ba86070293236',
          'legacy-chips/chip-list.spec.ts': '26263b1efa46119fc7a8ea1b8693af78401cb2b78a3a4a6fb1dc7b0c78618750',
          'legacy-dialog/dialog.spec.ts': 'dfc5961661c06ae15f186d25846f4a40f61880ac2c09e9975e0d9faabbbdea2b',
          'legacy-input/input.spec.ts': 'ed4f565e8ee1b853e1f1d469468cd8db70730c7585693d654ada3f6f0cc394ba',
          'legacy-menu/menu.spec.ts': '38b0486a0bc5053bda428540bd9059858ca50d4549bc277c698d42dc1cc0e7e6',
          'legacy-select/select.spec.ts': 'f96cb38f85bcbb73138f7a2f05eb713087181ca09037a7832f1c271e2ec63a13',
          'legacy-snack-bar/snack-bar.spec.ts': '15708b86b3aae3773bb5f0bfad8e6f952dce281e6722e7b5a2f6f06fcd105fd3',
          'legacy-table/table.spec.ts': 'f61e8eab5779d3e745b075308331394f56b6b75d6cb73a43d14acf0c836dbdad',
          'legacy-tabs/tab-group.spec.ts': '4bb7e40a519eae2697f2ef01afd8f36b9a0f7b1dde017f517ce9b6c0e093bc2e',
        }
        matched = set()
        for row in inventory['rows']:
            name = row['candidate'].removeprefix('projects/ngx-material-legacy/')
            if name in expected:
                assert row['candidate_sha256'] == retained[name]
                assert acceptance.sha256_file(self.root / row['candidate']) == expected[name]
                row['candidate_sha256'] = expected[name]
                matched.add(name)
        assert matched == set(expected)
        write_json(self.root / 'testing/legacy-runner/historical-inventory.json', inventory)
        shutil.copy2(ROOT / 'compatibility/rc/matrices/full-verify.json',
                     self.root / 'compatibility/rc/matrices/full-verify.json')
        write_json(self.root / 'projects/ngx-material-legacy/package.json', {'version': '22.0.0-rc.0'})
        spec = importlib.util.spec_from_file_location('coordinator_entry_fixture', self.root / 'scripts/rc-verify.py')
        self.verify = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.verify)
        for script in self.verify.SCRIPT_CHECKS:
            p = self.root / script
            if script == 'scripts/pack-draft-run.mjs':
                p.write_text('''import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const args=process.argv.slice(2), out=args[args.indexOf('--out')+1];
const line=args[args.indexOf('--line')+1];
fs.mkdirSync(out,{recursive:true});
const seen = {record:JSON.parse(fs.readFileSync(path.join(out,'pack-execution.json'),'utf8')),
  run_id:process.env.RC_RUN_ID,invocation_id:process.env.RC_INVOCATION_ID,
  binding:JSON.parse(process.env.RC_EVIDENCE_BINDING),output_dir:process.env.RC_ASSERTION_OUTPUT_DIR,
  artifact_existed:fs.existsSync(path.join(out,'library.tgz'))};
fs.writeFileSync(path.join(out,'pack-seen.json'),JSON.stringify(seen));
if(process.env.SYNTHETIC_FAIL==='scripts/pack-draft-run.mjs') process.exit(7);
fs.writeFileSync(path.join(out,'library.tgz'),'synthetic library bytes, not Angular');
fs.writeFileSync(path.join(out,'pack-meta.json'),JSON.stringify({tarball:'library.tgz'}));
const child=spawnSync(process.execPath,['scripts/write-draft-run.mjs','--line',line,'--out',out,
'--tarball',path.join(out,'library.tgz')],{stdio:'inherit'});
process.exit(child.status??1);
''')
            elif script.endswith('.py'):
                p.write_text("# Synthetic coordinator child; no product qualification.\n"
                             "import os, sys\n"
                             f"sys.exit(7 if os.environ.get('SYNTHETIC_FAIL') == {script!r} else 0)\n")
            else:
                relative = self.verify.FIXED_DETAILS.get(script, (None, None))[1]
                code = "// Synthetic product process for coordinator testing only.\n"
                if relative:
                    code += f"import fs from 'node:fs'; import path from 'node:path';\nconst p={json.dumps(relative)};\nfs.mkdirSync(path.dirname(p),{{recursive:true}});\nfs.writeFileSync(p,JSON.stringify({{result:'pass',synthetic:true}}));\n"
                code += "process.exit(process.env.SYNTHETIC_FAIL === " + json.dumps(script) + " ? 7 : 0);\n"
                p.write_text(code)
        subprocess.run(['git','add','.'],cwd=self.root,check=True,capture_output=True)
        subprocess.run(['git','commit','-qm','Synthetic coordinator children'],cwd=self.root,check=True,capture_output=True)
        self.env['CHAINMAN_MODE'] = 'host-nix'  # Model the field; this is NOT a canonical run.
        self.out = self.root / 'artifacts/coordinator-result'

    def coordinator(self, line='main'):
        return subprocess.run([sys.executable,'scripts/rc-verify.py','--out',str(self.out),'--line',line],
            cwd=self.root,env=self.env,capture_output=True,text=True,timeout=20)

    def test_all_slice_children_zero_still_returns_incomplete(self):
        result = self.coordinator()
        self.assertEqual(result.returncode, 2, result.stdout+result.stderr)
        summary = acceptance.read_json(self.out/'verify-summary.json')
        self.assertEqual(summary['completeness']['automatic_product_result'], 'incomplete')
        self.assertEqual(summary['completeness']['engineering_admission'], 'not-decided')
        self.assertIn('browser-matrix', summary['completeness']['incomplete_checks'])
        self.assertEqual(summary['results']['browser-matrix'], 'pass')
        run=acceptance.read_json(self.out/'run.json')
        acceptance.checked_file(self.out,run['execution_record'],'actual coordinator record')
        self.assertTrue(run['execution_inputs']['clean'])
        self.assertFalse((self.root/'compatibility/rc/reports/browser-matrix-slice.json').exists())

    def test_failed_child_with_passing_detail_remains_failed_in_execution_record(self):
        self.env['SYNTHETIC_FAIL'] = 'scripts/run-browser-matrix-slice.mjs'
        result = self.coordinator()
        self.assertEqual(result.returncode, 2, result.stdout+result.stderr)
        journal=acceptance.read_json(self.out/'execution-record.json')
        self.assertEqual(journal['process_results']['browser-matrix'],7)
        summary=acceptance.read_json(self.out/'verify-summary.json')
        self.assertIn('browser-matrix',summary['failed_required'])

    def test_pack_receives_frozen_identity_before_any_artifact_exists(self):
        result = self.coordinator()
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        seen = acceptance.read_json(self.out / 'pack-seen.json')
        final = acceptance.read_json(self.out / 'pack-execution.json')
        run = acceptance.read_json(self.out / 'run.json')
        record = acceptance.read_json(self.out / 'execution-record.json')
        report = acceptance.read_json(self.out / 'reports/pack-library.json')
        self.assertFalse(seen['artifact_existed'])
        self.assertEqual(seen['record']['status'], 'running')
        self.assertIsNone(seen['record']['exit_code'])
        self.assertEqual(seen['record']['invocation_id'], seen['invocation_id'])
        self.assertEqual(seen['binding'], final['binding'])
        self.assertEqual(seen['binding']['phase'], 'prepack')
        self.assertNotIn('artifacts_sha256', seen['binding'])
        self.assertEqual(final['invocation_id'], record['invocation_ids']['pack-library'])
        self.assertEqual(seen['run_id'], run['run_id'])
        self.assertEqual(report['invocation_id'], seen['invocation_id'])
        self.assertEqual(report['evidence_origin'], 'coordinator')
        self.assertEqual(report['prepack_binding'], seen['binding'])
        self.assertEqual(Path(seen['output_dir']), self.out / acceptance.assertion_directory('pack-library', seen['invocation_id']))
        self.assertEqual(record['binding'], report['binding'])
        self.assertEqual(final['status'], 'completed')
        self.assertEqual(final['exit_code'], 0)

    def test_pack_failure_preserves_real_invocation_without_run_manifest(self):
        self.env['SYNTHETIC_FAIL'] = 'scripts/pack-draft-run.mjs'
        result = self.coordinator()
        self.assertEqual(result.returncode, 7, result.stdout + result.stderr)
        record = acceptance.read_json(self.out / 'pack-execution.json')
        seen = acceptance.read_json(self.out / 'pack-seen.json')
        self.assertEqual(record['exit_code'], 7)
        self.assertEqual(record['invocation_id'], seen['invocation_id'])
        self.assertFalse((self.out / 'run.json').exists())

    def test_real_pack_wrapper_preserves_prepack_record_and_selected_run_id(self):
        # Use the unchanged repository wrapper; only ng-packagr's child is a fixture.
        shutil.copy2(ROOT / 'scripts/pack-draft-run.mjs', self.root / 'scripts/pack-draft-run.mjs')
        (self.root / 'scripts/pack-library.mjs').write_text('''import fs from 'node:fs';
import path from 'node:path';
const args=process.argv.slice(2),out=args[args.indexOf('--out')+1],line=args[args.indexOf('--line')+1];
const record=JSON.parse(fs.readFileSync(path.join(out,'pack-execution.json'),'utf8'));
if(record.status!=='running'||record.invocation_id!==process.env.RC_INVOCATION_ID) process.exit(8);
fs.writeFileSync(path.join(out,'library.tgz'),'synthetic bytes, not a library build');
fs.writeFileSync(path.join(out,'pack-meta.json'),JSON.stringify({line,tarball:'library.tgz'}));
''')
        subprocess.run(['git','add','.'], cwd=self.root, check=True, capture_output=True)
        subprocess.run(['git','commit','-qm','Synthetic pack child with actual wrapper'], cwd=self.root, check=True, capture_output=True)
        result = self.coordinator()
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        run = acceptance.read_json(self.out / 'run.json')
        pack = acceptance.read_json(self.out / 'pack-execution.json')
        self.assertEqual(run['run_id'], pack['run_id'])
        self.assertEqual(pack['status'], 'completed')
        self.assertEqual(pack['exit_code'], 0)
        acceptance.checked_file(self.out, run['pack_execution'], 'actual wrapper preserved record')

    def test_post_pack_environment_identity_cannot_replace_preflight_inputs(self):
        script = self.root / 'scripts/pack-draft-run.mjs'
        text = script.read_text().replace('process.exit(child.status??1);',
            "const p=path.join(out,'run.json'),run=JSON.parse(fs.readFileSync(p));run.environment.tool_versions.node='changed';fs.writeFileSync(p,JSON.stringify(run));process.exit(child.status??1);")
        script.write_text(text)
        subprocess.run(['git','add','.'], cwd=self.root, check=True, capture_output=True)
        subprocess.run(['git','commit','-qm','Synthetic drift fixture'], cwd=self.root, check=True, capture_output=True)
        result = self.coordinator()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('does not match the frozen prepack inputs', result.stderr)
        self.assertFalse((self.out / 'execution-record.json').exists())

    def test_wrong_line_fails_before_packing(self):
        result=self.coordinator('21.x')
        self.assertEqual(result.returncode,2,result.stdout+result.stderr)
        self.assertIn('does not match this checkout',result.stderr)
        self.assertFalse((self.out/'library.tgz').exists())


if __name__ == '__main__':
    unittest.main()
