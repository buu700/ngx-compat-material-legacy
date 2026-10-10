"""Source identity must be checked before artifact reads or browser acquisition."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class BrowserSourceIdentityTests(unittest.TestCase):
    def test_actual_entrypoint_rejects_wrong_line_commit_tree_and_dirty_source(self):
        result = subprocess.run(['node', 'tests/browser_source_identity_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['cases'], 10)
        self.assertEqual(report['rejected'], 8)
        self.assertFalse(report['native_executed'])

    def test_source_drift_cannot_produce_accepted_report(self):
        result = subprocess.run(['node', 'tests/browser_source_completion_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=20)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['scenarios'], 7)
        self.assertEqual(report['mutant_rejected'], 1)
        self.assertFalse(report['native_executed'])
        self.assertFalse(report['acceptance_credit'])
