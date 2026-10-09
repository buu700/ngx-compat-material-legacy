"""Fixed progress fixture styles and CSP enforcement must reach browser admission."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class ProgressCspStyleContractTests(unittest.TestCase):
    def test_defects_reach_actual_producer_and_slice_predicates(self):
        result = subprocess.run(['node', 'tests/progress_csp_style_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=20)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
