"""Coordinator regressions; subprocesses below are synthetic fixtures only."""
from __future__ import annotations
import contextlib
import importlib.util
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from test_rc_acceptance import CompleteFixture, write_json
import rc_acceptance as acceptance


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


verify = load('rc_verify_test', 'rc-verify.py')
lite = load('rc_lite_test', 'rc-verify-lite.py')


class CoordinatorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='rc-coordinator-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.f = CompleteFixture(self.root)
        self.run = verify.RunEvidence(self.f.run, self.f.run_dir, self.f.matrix_sha)
        self.root_patch = patch.object(verify, 'ROOT', self.root)
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)
        self.run_patch = patch.object(verify, 'ACTIVE_RUN', self.run)
        self.run_patch.start()
        self.addCleanup(self.run_patch.stop)
        self.fixed = self.root / 'compatibility/rc/reports/browser-matrix-slice.json'
        write_json(self.fixed, {'result': 'pass', 'age': 'old'})
        self.old = self.fixed.read_bytes()

    def test_capture_removes_old_before_child_and_restores_it(self):
        rel = self.fixed.relative_to(self.root)
        with verify.capture_fixed_report(self.root, self.f.run_dir, str(rel), 'browser-matrix') as out:
            self.assertFalse(self.fixed.exists())
            write_json(self.fixed, {'result': 'pass', 'age': 'new'})
        self.assertEqual(self.fixed.read_bytes(), self.old)
        self.assertEqual(acceptance.read_json(out)['age'], 'new')

    def test_no_new_report_cannot_reuse_old_pass(self):
        rel = self.fixed.relative_to(self.root)
        with self.assertRaisesRegex(acceptance.EvidenceError, 'did not produce'):
            with verify.capture_fixed_report(self.root, self.f.run_dir, str(rel), 'browser-matrix'):
                pass
        self.assertEqual(self.fixed.read_bytes(), self.old)
        self.assertFalse((self.f.run_dir / 'reports/details/browser-matrix.json').exists())

    def test_corrupt_child_report_cannot_be_indexed(self):
        rel = self.fixed.relative_to(self.root)
        with self.assertRaisesRegex(acceptance.EvidenceError, 'duplicate JSON'):
            with verify.capture_fixed_report(self.root, self.f.run_dir, str(rel), 'browser-matrix'):
                self.fixed.write_text('{"result":"fail","result":"pass"}')
        self.assertEqual(self.fixed.read_bytes(), self.old)

    def test_interrupt_restores_old_report(self):
        rel = self.fixed.relative_to(self.root)
        with self.assertRaises(KeyboardInterrupt):
            with verify.capture_fixed_report(self.root, self.f.run_dir, str(rel), 'browser-matrix'):
                raise KeyboardInterrupt()
        self.assertEqual(self.fixed.read_bytes(), self.old)

    def test_source_report_symlink_is_refused_without_touching_target(self):
        other = self.root / 'other.json'
        self.fixed.rename(other)
        self.fixed.symlink_to(other)
        with self.assertRaisesRegex(acceptance.EvidenceError, 'symlink'):
            with verify.capture_fixed_report(self.root, self.f.run_dir, str(self.fixed.relative_to(self.root)), 'browser-matrix'):
                self.fail('must not invoke child')
        self.assertEqual(other.read_bytes(), self.old)

    def test_new_symlink_is_refused_and_original_restored(self):
        other = self.root / 'other.json'
        other.write_bytes(b'{"outside":true}')
        with self.assertRaisesRegex(acceptance.EvidenceError, 'regular detail'):
            with verify.capture_fixed_report(self.root, self.f.run_dir, str(self.fixed.relative_to(self.root)), 'browser-matrix'):
                self.fixed.symlink_to(other)
        self.assertEqual(other.read_bytes(), b'{"outside":true}')
        self.assertEqual(self.fixed.read_bytes(), self.old)

    def test_missing_detail_after_zero_exit_becomes_failure(self):
        with patch.object(verify.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0)):
            with contextlib.redirect_stderr(io.StringIO()):
                code = verify.run_node('scripts/run-browser-matrix-slice.mjs', ['--run', 'synthetic.json'])
        self.assertNotEqual(code, 0)
        self.assertNotEqual(self.run.exit_codes['browser-matrix'], 0)
        self.assertEqual(self.fixed.read_bytes(), self.old)

    def test_nonzero_child_with_passing_json_stays_nonzero(self):
        def child(*args, **kwargs):
            write_json(self.fixed, {'result': 'pass'})
            self.assertEqual(kwargs['env']['RC_RUN_ID'], self.f.run['run_id'])
            self.assertTrue(kwargs['env']['RC_INVOCATION_ID'])
            return subprocess.CompletedProcess([], 7)
        with patch.object(verify.subprocess, 'run', side_effect=child):
            code = verify.run_node('scripts/run-browser-matrix-slice.mjs', [])
        self.assertEqual(code, 7)
        self.assertEqual(self.run.exit_codes['browser-matrix'], 7)
        self.assertEqual(self.fixed.read_bytes(), self.old)

    def test_success_detail_is_run_local_and_hashed(self):
        def child(*args, **kwargs):
            write_json(self.fixed, {'result': 'pass'})
            return subprocess.CompletedProcess([], 0)
        with patch.object(verify.subprocess, 'run', side_effect=child):
            self.assertEqual(verify.run_node('scripts/run-browser-matrix-slice.mjs', []), 0)
        record = self.run.outputs['browser-matrix'][0]
        acceptance.checked_file(self.f.run_dir, record, 'detail')
        self.assertEqual(self.fixed.read_bytes(), self.old)

    def test_source_smoke_is_not_labeled_as_library_consumption(self):
        path = self.f.run_dir / 'reports/motion-smoke.json'
        path.unlink()
        verify.write_check_report(self.f.run_dir, self.f.run['run_id'], 'main', 'motion-smoke', exit_code=0)
        report = acceptance.read_json(path)
        self.assertEqual(report['subject_kind'], 'source')
        self.assertEqual(report['subject_ids'], ['source'])
        self.assertEqual(report['artifacts'], {})
        self.assertEqual(report['coverage'], 'slice')

    def _real_migration_ids(self):
        matrix = acceptance.read_json(verify.MATRIX_PATH)
        row = next(item for item in matrix["checks"] if item["check_id"] == "migration-packaged")
        return row, acceptance.expected_cases(row, "main")

    def _write_migration_assertions(self, ids):
        invocation = self.run.invocation("migration-packaged")
        directory = self.f.run_dir / acceptance.assertion_directory("migration-packaged", invocation)
        directory.mkdir(parents=True, exist_ok=True)
        for case_id in ids:
            write_json(directory / f"{case_id.replace('/', '__')}.json", {
                "case_id": case_id,
                "result": "pass",
                "kind": "assertion",
                "line": "main",
            })
        return directory

    def test_complete_main_migration_report_uses_real_ids_and_is_not_overwritten(self):
        row, ids = self._real_migration_ids()
        for group, group_ids in row["acceptance"]["cases_by_line"]["21.x"].items():
            self.assertIsNone(group_ids, group)
        self._write_migration_assertions(ids)
        path = self.f.run_dir / "reports/migration-packaged.json"
        path.unlink()
        verify.write_migration_packaged_report(self.f.run_dir, self.f.run["run_id"], "main", exit_code=0)
        report = acceptance.read_json(path)
        self.assertEqual(report["coverage"], "complete")
        self.assertEqual(report["line"], "main")
        self.assertEqual(report["result"], "pass")
        self.assertEqual(report["exit_code"], 0)
        self.assertEqual(set(report["expected_case_ids"]), set(ids))
        self.assertEqual(set(report["discovered_case_ids"]), set(ids))
        self.assertEqual(set(report["executed_case_ids"]), set(ids))
        self.assertEqual(set(report["passed_case_ids"]), set(ids))
        self.assertEqual(report["passed"], len(ids))
        self.assertEqual(report["failed"], 0)
        self.assertEqual(report["skipped"], 0)
        self.assertEqual(report["failed_case_ids"], [])
        self.assertEqual(report["skipped_case_ids"], [])
        self.assertEqual(report["unresolved_case_ids"], [])
        self.assertEqual(report["exceptions"], [])
        self.assertEqual(report["subject_kind"], "artifact")
        self.assertEqual(report["subject_ids"], ["library", "migrate-cli"])
        for item in self.f.run["artifacts"]:
            self.assertEqual(report["artifacts"][item["id"]], {"sha256": item["sha256"], "bytes": item["bytes"]})
        self.assertEqual(len(report["case_results"]), len(ids))
        paths = {item["path"] for item in report["outputs"]}
        prefix = acceptance.assertion_directory("migration-packaged", report["invocation_id"]) + "/"
        self.assertTrue(paths)
        for item in report["case_results"]:
            self.assertEqual(item["result"], "pass")
            self.assertEqual(item["kind"], "assertion")
            self.assertTrue(set(item["output_paths"]) <= paths)
        for output in report["outputs"]:
            self.assertTrue(output["path"].startswith(prefix))
            self.assertNotEqual(Path(output["path"]).name, "run.json")
            acceptance.checked_file(self.f.run_dir, output, "assertion")
        self.assertNotIn("g04_claim", report)
        self.assertNotIn("g05_claim", report)
        self.assertNotIn("approved", report)
        before = path.read_bytes()
        verify.write_check_report(self.f.run_dir, self.f.run["run_id"], "main", "migration-packaged", exit_code=0)
        self.assertEqual(path.read_bytes(), before)

    def test_failed_migration_child_stays_incomplete_slice(self):
        _, ids = self._real_migration_ids()
        self._write_migration_assertions(ids)
        path = self.f.run_dir / "reports/migration-packaged.json"
        path.unlink()
        verify.write_migration_packaged_report(
            self.f.run_dir, self.f.run["run_id"], "main", exit_code=7,
        )
        report = acceptance.read_json(path)
        self.assertEqual(report["coverage"], "slice")
        self.assertEqual(report["result"], "fail")
        self.assertEqual(report["exit_code"], 7)

    def test_missing_or_copied_migration_assertion_stays_slice(self):
        _, ids = self._real_migration_ids()
        directory = self._write_migration_assertions(ids[:-1])
        path = self.f.run_dir / "reports/migration-packaged.json"
        path.unlink()
        verify.write_migration_packaged_report(self.f.run_dir, self.f.run["run_id"], "main", exit_code=0)
        self.assertEqual(acceptance.read_json(path)["coverage"], "slice")
        copied = directory / f"{ids[-1].replace('/', '__')}.json"
        copied.write_bytes(self.f.run_path.read_bytes())
        path.unlink()
        verify.write_migration_packaged_report(self.f.run_dir, self.f.run["run_id"], "main", exit_code=0)
        self.assertEqual(acceptance.read_json(path)["coverage"], "slice")

    def test_21x_migration_report_does_not_roster_main_cases(self):
        _, ids = self._real_migration_ids()
        self._write_migration_assertions(ids)
        path = self.f.run_dir / "reports/migration-packaged.json"
        path.unlink()
        with patch.object(verify, "expected_cases", side_effect=AssertionError("21.x must not roster main cases")):
            verify.write_migration_packaged_report(
                self.f.run_dir, self.f.run["run_id"], "21.x", exit_code=0,
            )
        report = acceptance.read_json(path)
        self.assertEqual(report["coverage"], "slice")
        self.assertEqual(report["line"], "21.x")

    def test_cli_slice_does_not_claim_packaged_schematic_subject(self):
        path = self.f.run_dir / 'reports/migration-packaged.json'
        path.unlink()
        verify.write_check_report(self.f.run_dir, self.f.run['run_id'], 'main', 'migration-packaged', exit_code=0)
        report = acceptance.read_json(path)
        self.assertEqual(report['subject_ids'], ['migrate-cli'])
        self.assertEqual(set(report['artifacts']), {'migrate-cli'})
        self.assertEqual(report['coverage'], 'slice')

    def test_full_child_report_not_overwritten_by_process_wrapper(self):
        path = self.f.run_dir / 'reports/packed-consumer.json'
        before = path.read_bytes()
        verify.write_check_report(self.f.run_dir, self.f.run['run_id'], 'main', 'packed-consumer', exit_code=0)
        self.assertEqual(path.read_bytes(), before)

    def test_partial_child_report_is_retained_not_upgraded(self):
        path = self.f.run_dir / 'reports/packed-consumer.json'
        report = acceptance.read_json(path)
        report.pop('coverage')
        write_json(path, report)
        verify.write_check_report(self.f.run_dir, self.f.run['run_id'], 'main', 'packed-consumer', exit_code=0)
        wrapped = acceptance.read_json(path)
        self.assertEqual(wrapped['coverage'], 'slice')
        self.assertTrue(wrapped['outputs'])
        for record in wrapped['outputs']:
            acceptance.checked_file(self.f.run_dir, record, 'child details')

    def test_failed_first_migration_child_cannot_be_overwritten_by_second(self):
        self.run.record_exit('migration-packaged', 7)
        self.run.record_exit('migration-packaged', 0)
        self.assertEqual(self.run.exit_codes['migration-packaged'], 7)

    def test_full_verifier_lock_rejects_concurrent_owner(self):
        with verify.verifier_lock(self.root):
            with self.assertRaisesRegex(acceptance.EvidenceError, 'another full verifier'):
                with verify.verifier_lock(self.root):
                    self.fail('must not enter')
        with verify.verifier_lock(self.root):
            pass

    def test_valid_fully_implemented_matrix_passes_lite_structure_guard(self):
        with patch.object(lite, 'ROOT', self.root), patch.object(lite.subprocess, 'run', return_value=subprocess.CompletedProcess([], 2, '', 'usage: --out')):
            lite.check_full_verify_refuses_subsets()

    def test_malformed_genuine_family_report_is_not_ignored(self):
        report_path = self.root / 'family.json'
        for invalid in (-1, True):
            report = {'totals': {'executed': invalid, 'passed': invalid, 'failed': 0, 'skipped': 0}, 'failures': [], 'mapped_specs': []}
            write_json(report_path, report)
            with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
                lite.check_family_report(report_path, set(), root=self.root)

    def test_interrupted_pack_keeps_assigned_identity_and_nonzero_exit(self):
        out = self.root / 'artifacts/interrupted-pack'
        out.mkdir()
        with patch.object(verify, 'pack_environment', return_value=(self.f.run['environment'], self.f.run['oracles'])), \
                patch.object(verify.subprocess, 'run', side_effect=KeyboardInterrupt):
            with self.assertRaises(KeyboardInterrupt):
                verify.execute_pack(out, 'main', self.f.run['execution_inputs'], self.f.matrix_sha)
        record = acceptance.read_json(out / 'pack-execution.json')
        self.assertEqual(record['status'], 'interrupted')
        self.assertEqual(record['exit_code'], 130)
        self.assertTrue(record['invocation_id'])
        self.assertEqual(record['binding']['phase'], 'prepack')
        self.assertIsNotNone(record['finished_at'])
        self.assertFalse((out / 'run.json').exists())

    def test_pack_launch_failure_preserves_input_only_record(self):
        out = self.root / 'artifacts/unlaunched-pack'
        out.mkdir()
        with patch.object(verify, 'pack_environment', return_value=(self.f.run['environment'], self.f.run['oracles'])), \
                patch.object(verify.subprocess, 'run', side_effect=OSError('synthetic launch failure')):
            with self.assertRaises(OSError):
                verify.execute_pack(out, 'main', self.f.run['execution_inputs'], self.f.matrix_sha)
        record = acceptance.read_json(out / 'pack-execution.json')
        self.assertEqual(record['status'], 'launch-failed')
        self.assertEqual(record['exit_code'], 1)
        self.assertNotIn('artifacts_sha256', record['binding'])


class CurrentBindingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='rc-current-binding-')
        self.addCleanup(self.temp.cleanup)
        self.f = CompleteFixture(Path(self.temp.name))
        self.candidate = 'projects/ngx-material-legacy/legacy-card/testing/card-harness.spec.ts'
        p = self.f.root / self.candidate
        p.parent.mkdir(parents=True)
        p.write_text('// synthetic test fixture')
        self.row = {'candidate': self.candidate, 'historical_path': 'src/material/legacy-card/testing/card-harness.spec.ts',
                    'execution': {'bound_to_current_head': True}}
        self.report = {'run_id': self.f.run['run_id'], 'line': 'main', 'subject_mode': 'artifact',
            'artifact_sha256': self.f.run['artifacts'][0]['sha256'], 'totals': {'executed': 1, 'passed': 1, 'failed': 0, 'skipped': 0},
            'failures': [], 'mapped_specs': [{'candidate': self.candidate, 'historical_path': self.row['historical_path']}]}
        self.report_path = self.f.run_dir / 'reports/legacy-card.json'
        self.save()
        def git(cmd, **kwargs):
            value = 'a' * 40 if cmd[-1] == 'HEAD' else 'b' * 40
            return subprocess.CompletedProcess(cmd, 0, value + '\n', '')
        self.mock = patch.object(lite.subprocess, 'run', side_effect=git)
        self.mock.start()
        self.addCleanup(self.mock.stop)

    def save(self):
        write_json(self.report_path, self.report)
        self.row['execution']['receipt'] = {'run_manifest': self.f.run_path.relative_to(self.f.root).as_posix(),
            'report': {'path': self.report_path.relative_to(self.f.run_dir).as_posix(),
                'bytes': self.report_path.stat().st_size, 'sha256': acceptance.sha256_file(self.report_path)}}

    def test_bound_current_source_receipt_is_accepted(self):
        lite.check_current_binding(self.row, root=self.f.root)

    def test_claim_without_receipt_is_rejected(self):
        del self.row['execution']['receipt']
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            lite.check_current_binding(self.row, root=self.f.root)

    def test_old_source_receipt_is_rejected(self):
        self.f.run['source']['commit'] = '0' * 40
        write_json(self.f.run_path, self.f.run)
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            lite.check_current_binding(self.row, root=self.f.root)

    def test_wrong_original_mapping_is_rejected(self):
        self.report['mapped_specs'][0]['historical_path'] = 'unrelated'
        self.save()
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            lite.check_current_binding(self.row, root=self.f.root)

    def test_tampered_receipt_or_artifact_is_rejected(self):
        (self.f.run_dir / 'library.tgz').write_bytes(b'tamper')
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            lite.check_current_binding(self.row, root=self.f.root)


class InputDriftTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='rc-input-drift-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        package = self.root / 'projects/ngx-material-legacy/package.json'
        package.parent.mkdir(parents=True)
        package.write_text('{"version":"22.0.0-rc.0"}\n')
        source = self.root / 'projects/ngx-material-legacy/legacy-button/button.ts'
        source.parent.mkdir(parents=True)
        source.write_text('export const button = 1;\n')
        checker = self.root / 'scripts/checker.py'
        checker.parent.mkdir(parents=True)
        checker.write_text('print(1)\n')
        (self.root / 'pnpm-lock.yaml').write_text('lock: 1\n')
        (self.root / 'toolchain-lock.json').write_text('{"node":"24.21.0"}\n')
        (self.root / 'chainman.lock').write_text('b' * 40 + '\n')
        matrix = self.root / 'compatibility/rc/matrices/full-verify.json'
        matrix.parent.mkdir(parents=True)
        matrix.write_text('{"checks":[]}\n')
        self.git = self._git()
        self.git('add', '.')
        self.git('commit', '-qm', 'Synthetic input fixture')

    def _git(self):
        env = {**os.environ, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null'}
        def git(*args):
            return subprocess.run(['git', *args], cwd=self.root, env=env, capture_output=True, text=True, check=True).stdout.strip()
        git('init', '-q')
        git('config', 'user.name', 'Synthetic verifier test')
        git('config', 'user.email', 'synthetic@example.invalid')
        git('config', 'core.hooksPath', '/dev/null')
        return git

    def _change(self, relative, text):
        before = verify.observe_inputs(self.root)
        path = self.root / relative
        path.write_text(text)
        after = verify.observe_inputs(self.root)
        named = {item['path']: item for item in verify.describe_input_drift(before, after)}
        self.assertIn(relative, named)
        row = named[relative]
        self.assertEqual(row['change'], 'changed')
        self.assertNotEqual(row['before_sha256'], row['after_sha256'])
        self.assertNotEqual(before['fingerprint']['inputs_sha256'], after['fingerprint']['inputs_sha256'])
        return row

    def test_unchanged_observation_has_no_drift(self):
        before = verify.observe_inputs(self.root)
        after = verify.observe_inputs(self.root)
        self.assertEqual(verify.describe_input_drift(before, after), [])
        self.assertEqual(before['fingerprint'], after['fingerprint'])

    def test_product_lock_matrix_and_checker_mutations_are_named(self):
        self.assertEqual(self._change('projects/ngx-material-legacy/legacy-button/button.ts', 'export const button = 2;\n')['role'], 'product-source')
        self.git('checkout', '--', '.')
        self.assertEqual(self._change('pnpm-lock.yaml', 'lock: 2\n')['role'], 'lock')
        self.git('checkout', '--', '.')
        self.assertEqual(self._change('compatibility/rc/matrices/full-verify.json', '{"checks":["x"]}\n')['role'], 'matrix')
        self.git('checkout', '--', '.')
        self.assertEqual(self._change('scripts/checker.py', 'print(2)\n')['role'], 'checker')

    def test_deleted_and_new_paths_are_named(self):
        before = verify.observe_inputs(self.root)
        (self.root / 'projects/ngx-material-legacy/legacy-button/button.ts').unlink()
        after = verify.observe_inputs(self.root)
        missing = {item['path']: item for item in verify.describe_input_drift(before, after)}
        self.assertEqual(missing['projects/ngx-material-legacy/legacy-button/button.ts']['change'], 'missing')
        self.assertIsNone(missing['projects/ngx-material-legacy/legacy-button/button.ts']['after_sha256'])
        self.git('checkout', '--', '.')
        before = verify.observe_inputs(self.root)
        (self.root / 'scripts/new-checker.py').write_text('print(3)\n')
        after = verify.observe_inputs(self.root)
        created = {item['path']: item for item in verify.describe_input_drift(before, after)}
        self.assertEqual(created['scripts/new-checker.py']['change'], 'new')
        self.assertEqual(created['scripts/new-checker.py']['role'], 'checker')
        self.assertIsNone(created['scripts/new-checker.py']['before_sha256'])

    def test_motion_receipt_is_not_rewritten_for_a_coordinated_run(self):
        receipt = ROOT / 'compatibility/pack-proof/motion-lifecycle-smoke.json'
        original = receipt.read_bytes()
        self.addCleanup(lambda: receipt.write_bytes(original))
        out = self.root / 'motion-out'
        out.mkdir()
        env = {**os.environ, 'RC_CHECK_ID': 'motion-smoke', 'RC_ASSERTION_OUTPUT_DIR': str(out)}
        result = subprocess.run(['node', 'scripts/motion-lifecycle-smoke.mjs'], cwd=ROOT, env=env, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stderr[-2000:])
        self.assertEqual(receipt.read_bytes(), original)
        written = json.loads((out / 'motion-lifecycle-smoke.json').read_text())
        self.assertEqual(written['status'], 'ok')


if __name__ == '__main__':
    unittest.main()
