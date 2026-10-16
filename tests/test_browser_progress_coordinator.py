"""The actual release coordinator must consume both native progress CSP probes."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class BrowserProgressCoordinatorTests(unittest.TestCase):
    def test_child_failures_and_bad_progress_cannot_receive_release_admission(self):
        result = subprocess.run(['node', 'tests/browser_progress_coordinator_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=25)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['defective_progress_results_rejected'], 26)
        self.assertEqual(report['defective_native_results_rejected'], 28)
        self.assertEqual(report['coordinator_mutants_detected'], 4)
        self.assertEqual(report['runtime_source_mutants_detected'], 3)
        self.assertFalse(report['native_executed'])
        self.assertFalse(report['acceptance_credit'])
