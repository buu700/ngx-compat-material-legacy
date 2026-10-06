"""Coordinator regressions for run-local receipts and source-input drift (FIN-07 A1).

Subprocesses below are synthetic fixtures or the lightweight motion receipt writer.
Passing these tests cannot certify Angular, browser, audit or release behavior.
"""
from __future__ import annotations

import contextlib
import hashlib
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
sys.path.insert(0, str(ROOT / 'tests'))
sys.path.insert(0, str(ROOT / 'scripts'))
from test_rc_acceptance import CompleteFixture, write_json
import rc_acceptance as acceptance


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


verify = load('rc_verify_test', 'rc-verify.py')


class CaptureFixedReportTests(unittest.TestCase):
    """Existing diagnostics survive; new observations belong to this run; missing child output fails."""

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

    def test_existing_diagnostic_survives_capture(self):
        rel = self.fixed.relative_to(self.root)
        with verify.capture_fixed_report(self.root, self.f.run_dir, str(rel), 'browser-matrix') as out:
            self.assertFalse(self.fixed.exists())
            write_json(self.fixed, {'result': 'pass', 'age': 'new', 'run': self.f.run['run_id']})
        self.assertEqual(self.fixed.read_bytes(), self.old)
        body = acceptance.read_json(out)
        self.assertEqual(body['age'], 'new')
        self.assertEqual(body['run'], self.f.run['run_id'])

    def test_success_detail_is_run_local_and_hashed(self):
        def child(*args, **kwargs):
            write_json(self.fixed, {'result': 'pass', 'run': kwargs['env']['RC_RUN_ID']})
            return subprocess.CompletedProcess([], 0)

        with patch.object(verify.subprocess, 'run', side_effect=child):
            self.assertEqual(verify.run_node('scripts/run-browser-matrix-slice.mjs', []), 0)
        record = self.run.outputs['browser-matrix'][0]
        acceptance.checked_file(self.f.run_dir, record, 'detail')
        self.assertEqual(self.fixed.read_bytes(), self.old)
        detail = acceptance.read_json(self.f.run_dir / record['path'])
        self.assertEqual(detail['run'], self.f.run['run_id'])

    def test_missing_child_output_fails_without_reusing_old(self):
        rel = self.fixed.relative_to(self.root)
        with self.assertRaisesRegex(acceptance.EvidenceError, 'did not produce'):
            with verify.capture_fixed_report(self.root, self.f.run_dir, str(rel), 'browser-matrix'):
                pass
        self.assertEqual(self.fixed.read_bytes(), self.old)
        self.assertFalse((self.f.run_dir / 'reports/details/browser-matrix.json').exists())

    def test_missing_detail_after_zero_exit_becomes_failure(self):
        with patch.object(verify.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0)):
            with contextlib.redirect_stderr(io.StringIO()):
                code = verify.run_node('scripts/run-browser-matrix-slice.mjs', ['--run', 'synthetic.json'])
        self.assertNotEqual(code, 0)
        self.assertNotEqual(self.run.exit_codes['browser-matrix'], 0)
        self.assertEqual(self.fixed.read_bytes(), self.old)


class RunLocalReceiptTests(unittest.TestCase):
    """Coordinated writers must not mutate tracked pack-proof receipts."""

    def test_pack_proof_smokes_are_derived_diagnostics(self):
        self.assertEqual(
            verify.classify_input('compatibility/pack-proof/aot-harness-smoke.json'),
            'derived-diagnostic',
        )
        self.assertEqual(
            verify.classify_input('compatibility/pack-proof/motion-lifecycle-smoke.json'),
            'derived-diagnostic',
        )
        self.assertEqual(
            verify.classify_input('compatibility/pack-proof/consumer-smoke.json'),
            'consumed-input',
        )

    def test_motion_receipt_is_not_rewritten_for_a_coordinated_run(self):
        receipt = ROOT / 'compatibility/pack-proof/motion-lifecycle-smoke.json'
        original = receipt.read_bytes()
        self.addCleanup(lambda: receipt.write_bytes(original))
        out = Path(tempfile.mkdtemp(prefix='motion-out-'))
        self.addCleanup(lambda: __import__('shutil').rmtree(out, ignore_errors=True))
        env = {**os.environ, 'RC_CHECK_ID': 'motion-smoke', 'RC_ASSERTION_OUTPUT_DIR': str(out)}
        result = subprocess.run(
            ['node', 'scripts/motion-lifecycle-smoke.mjs'],
            cwd=ROOT,
            env=env,
            capture_output=True,
            text=True,
            timeout=60,
        )
        self.assertEqual(result.returncode, 0, result.stderr[-2000:])
        self.assertEqual(receipt.read_bytes(), original)
        written = json.loads((out / 'motion-lifecycle-smoke.json').read_text())
        self.assertEqual(written['status'], 'ok')

    def test_packed_consumer_run_mode_rejects_stale_bytes_without_touching_tracked(self):
        receipt = ROOT / 'compatibility/pack-proof/aot-harness-smoke.json'
        original = receipt.read_bytes()
        self.addCleanup(lambda: receipt.write_bytes(original))
        run_dir = Path(tempfile.mkdtemp(prefix='packed-consumer-run-'))
        self.addCleanup(lambda: __import__('shutil').rmtree(run_dir, ignore_errors=True))
        library = run_dir / 'library.tgz'
        library.write_bytes(b'synthetic-library-bytes')
        digest = hashlib.sha256(library.read_bytes()).hexdigest()
        # Stale: declare a different sha256 than the file on disk.
        write_json(run_dir / 'run.json', {
            'schema_version': 1,
            'template': False,
            'stage': 'draft',
            'purpose': 'candidate',
            'run_id': 'synthetic-stale-consumer-run',
            'source': {'line': '21.x'},
            'artifacts': [{
                'id': 'library',
                'path': 'library.tgz',
                'sha256': '0' * 64,
                'bytes': library.stat().st_size,
            }],
        })
        result = subprocess.run(
            ['node', 'scripts/packed-consumer-aot-smoke.mjs', '--run', str(run_dir / 'run.json')],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=60,
        )
        self.assertNotEqual(result.returncode, 0, result.stdout[-1000:] + result.stderr[-1000:])
        self.assertEqual(receipt.read_bytes(), original)
        self.assertFalse((run_dir / 'reports/packed-consumer-detail.json').exists())
        report = json.loads((run_dir / 'reports/packed-consumer.json').read_text())
        self.assertEqual(report['run_id'], 'synthetic-stale-consumer-run')
        self.assertEqual(report['result'], 'fail')
        # Sanity: the on-disk digest differs from the declared stale one.
        self.assertNotEqual(digest, '0' * 64)

    def test_packed_consumer_missing_run_artifact_fails_without_touching_tracked(self):
        receipt = ROOT / 'compatibility/pack-proof/aot-harness-smoke.json'
        original = receipt.read_bytes()
        self.addCleanup(lambda: receipt.write_bytes(original))
        run_dir = Path(tempfile.mkdtemp(prefix='packed-consumer-missing-'))
        self.addCleanup(lambda: __import__('shutil').rmtree(run_dir, ignore_errors=True))
        write_json(run_dir / 'run.json', {
            'schema_version': 1,
            'template': False,
            'stage': 'draft',
            'purpose': 'candidate',
            'run_id': 'synthetic-missing-consumer-run',
            'source': {'line': '21.x'},
            'artifacts': [{
                'id': 'library',
                'path': 'library.tgz',
                'sha256': 'a' * 64,
                'bytes': 12,
            }],
        })
        result = subprocess.run(
            ['node', 'scripts/packed-consumer-aot-smoke.mjs', '--run', str(run_dir / 'run.json')],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=60,
        )
        self.assertEqual(result.returncode, 2, result.stderr[-1000:])
        self.assertEqual(receipt.read_bytes(), original)
        self.assertFalse((run_dir / 'reports/packed-consumer-detail.json').exists())


class InputDriftTests(unittest.TestCase):
    """Changing a real consumed input is still detected."""

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='rc-input-drift-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        package = self.root / 'projects/ngx-material-legacy/package.json'
        package.parent.mkdir(parents=True)
        package.write_text('{"version":"21.0.0-rc.0"}\n')
        source = self.root / 'projects/ngx-material-legacy/legacy-button/button.ts'
        source.parent.mkdir(parents=True)
        source.write_text('export const button = 1;\n')
        checker = self.root / 'scripts/checker.py'
        checker.parent.mkdir(parents=True)
        checker.write_text('print(1)\n')
        (self.root / 'pnpm-lock.yaml').write_text('lock: 1\n')
        (self.root / 'toolchain-lock.json').write_text('{"node":"20.19.0"}\n')
        (self.root / 'chainman.lock').write_text('b' * 40 + '\n')
        matrix = self.root / 'compatibility/rc/matrices/full-verify.json'
        matrix.parent.mkdir(parents=True)
        matrix.write_text('{"checks":[]}\n')
        consumed = self.root / 'compatibility/pack-proof/consumer-smoke.json'
        consumed.parent.mkdir(parents=True)
        consumed.write_text('{"status":"ok"}\n')
        self.git = self._git()
        self.git('add', '.')
        self.git('commit', '-qm', 'Synthetic input fixture')

    def _git(self):
        env = {**os.environ, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null'}

        def git(*args):
            return subprocess.run(
                ['git', *args], cwd=self.root, env=env, capture_output=True, text=True, check=True,
            ).stdout.strip()

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

    def test_consumed_input_mutation_is_detected(self):
        row = self._change('compatibility/pack-proof/consumer-smoke.json', '{"status":"mutated"}\n')
        self.assertEqual(row['role'], 'consumed-input')

    def test_product_source_mutation_is_detected(self):
        row = self._change('projects/ngx-material-legacy/legacy-button/button.ts', 'export const button = 2;\n')
        self.assertEqual(row['role'], 'product-source')


if __name__ == '__main__':
    unittest.main()
