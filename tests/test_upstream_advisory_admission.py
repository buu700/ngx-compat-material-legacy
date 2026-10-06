"""Real advisory-admission helper against isolated positive and adversarial fixtures."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class UpstreamAdvisoryAdmissionTests(unittest.TestCase):
    def test_bound_lookup_and_fail_closed_mutations(self):
        result = subprocess.run(['node', '--test', 'tests/upstream/advisory-admission.test.mjs'],
                                cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
