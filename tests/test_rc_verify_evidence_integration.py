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


if __name__ == '__main__':
    unittest.main()
