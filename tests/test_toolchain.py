from __future__ import annotations

import copy
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('toolchain_policy', ROOT / 'scripts/check-toolchain.py')
assert spec and spec.loader
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class ToolchainChecks(unittest.TestCase):
    def lock(self):
        return json.loads((ROOT / 'templates/toolchain-lock.json').read_text())

    def evidence(self):
        lock = self.lock()
        return {'tools': {name: {
            'version': version, 'published_at': '2026-07-01T00:00:00Z',
            'source': 'https://example.invalid/fixture',
            'artifact_integrity': 'sha256-' + 'a' * 64, 'verified': True,
        } for name, version in {**lock['repository'], 'npm': lock['release']['npm']}.items()}}

    def now(self):
        return datetime(2026, 9, 23, 19, 0, tzinfo=timezone.utc)

    def test_delivered_configuration_consistent(self):
        self.assertEqual(checker.inspect_configuration(ROOT / 'templates', self.lock()), [])

    def test_floating_pnpm_pin_fails(self):
        lock = self.lock(); lock['repository']['pnpm'] = '12.x'
        self.assertTrue(checker.validate_lock(lock))

    def test_wrong_node_line_fails(self):
        lock = self.lock(); lock['repository']['node'] = '22.22.3'
        self.assertTrue(checker.validate_lock(lock))

    def test_staging_npm_floor_fails(self):
        lock = self.lock(); lock['release']['npm'] = '11.14.0'
        self.assertTrue(checker.validate_lock(lock))

    def test_configuration_drift_fails(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            for filename in ['package.json', '.node-version', '.npm-version', 'pnpm-workspace.yaml']:
                shutil.copyfile(ROOT / 'templates' / filename, root / filename)
            (root / '.node-version').write_text('24.20.0\n')
            self.assertTrue(checker.inspect_configuration(root, self.lock()))

    def test_pending_bootstrap_evidence_fails(self):
        evidence = json.loads((ROOT / 'templates/tooling-release-evidence.json').read_text())
        self.assertTrue(checker.validate_evidence(self.lock(), evidence, self.now()))

    def test_synthetic_aged_evidence_passes(self):
        self.assertEqual(checker.validate_evidence(self.lock(), self.evidence(), self.now()), [])

    def test_evidence_wrong_version_fails(self):
        evidence = self.evidence(); evidence['tools']['pnpm']['version'] = '12.5.1'
        self.assertTrue(checker.validate_evidence(self.lock(), evidence, self.now()))

    def test_young_or_future_evidence_fails(self):
        for timestamp in ['2026-09-22T00:00:00Z', '2026-12-01T00:00:00Z']:
            with self.subTest(timestamp=timestamp):
                evidence = self.evidence(); evidence['tools']['node']['published_at'] = timestamp
                self.assertTrue(checker.validate_evidence(self.lock(), evidence, self.now()))

    def test_exact_seven_day_boundary(self):
        evidence = self.evidence(); evidence['tools']['node']['published_at'] = '2026-09-16T19:00:00Z'
        self.assertEqual(checker.validate_evidence(self.lock(), evidence, self.now()), [])

    def test_missing_timezone_fails(self):
        evidence = self.evidence(); evidence['tools']['node']['published_at'] = '2026-09-08T12:00:00'
        self.assertTrue(checker.validate_evidence(self.lock(), evidence, self.now()))

    def test_reviewed_unexpired_exact_security_exception(self):
        evidence = self.evidence(); evidence['tools']['pnpm']['published_at'] = '2026-09-22T00:00:00Z'
        lock = self.lock(); lock['exceptions'] = [{
            'tool': 'pnpm', 'version': lock['repository']['pnpm'],
            'expires_at': '2026-09-25T00:00:00Z',
            'reason': 'Synthetic urgent security fix fixture', 'approved_by': 'fixture-reviewer'}]
        self.assertEqual(checker.validate_evidence(lock, evidence, self.now()), [])
        lock['exceptions'][0]['expires_at'] = '2026-09-23T00:00:00Z'
        self.assertTrue(checker.validate_evidence(lock, evidence, self.now()))

    def test_exception_does_not_waive_integrity(self):
        evidence = self.evidence(); evidence['tools']['pnpm']['artifact_integrity'] = None
        self.assertTrue(checker.validate_evidence(self.lock(), evidence, self.now()))

    def test_published_fragment_passes_and_engine_leak_fails(self):
        manifest = json.loads((ROOT / 'templates/library-package-metadata.json').read_text())
        self.assertEqual(checker.publication_checks(manifest, 22), [])
        manifest['engines']['node'] = self.lock()['repository']['node']
        self.assertTrue(checker.publication_checks(manifest, 22))

    def test_wrong_scope_and_private_access_fail(self):
        manifest = json.loads((ROOT / 'templates/library-package-metadata.json').read_text())
        manifest['publishConfig']['access'] = 'restricted'
        manifest['repository']['url'] = 'git+https://github.com/angular/components.git'
        self.assertGreaterEqual(len(checker.publication_checks(manifest, 22)), 2)

    def test_runtime_asserts_release_npm(self):
        expected = {'node': 'v24.21.0\n', 'pnpm': '12.4.2\n', 'npm': '11.19.0\n'}
        def fake_run(command, **kwargs):
            return subprocess.CompletedProcess(command, 0, expected[command[0]], '')
        with patch.object(checker.subprocess, 'run', side_effect=fake_run):
            errors, observed = checker.runtime_checks(self.lock(), release=True)
        self.assertFalse(errors)
        self.assertEqual(observed['npm'], '11.19.0')

    def test_cli_help_no_tool_installs(self):
        result = subprocess.run(['python3', str(ROOT / 'scripts/check-toolchain.py'), '--help'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_coexistence_required_native_m3_optional(self):
        data = json.loads((ROOT / 'research/ci-policy.json').read_text())
        self.assertEqual(data['first_stable'], {'m2_m3_coexistence': True, 'native_m3_legacy_theme': False})
        self.assertEqual(data['dependency_review']['event'], 'pull_request')
        doc = (ROOT / 'docs/03-sass-contract.md').read_text()
        self.assertIn('not required for RC or first stable', doc)
        self.assertIn('all-owned-component-themes', doc)


if __name__ == '__main__':
    unittest.main()
