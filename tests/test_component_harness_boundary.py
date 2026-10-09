"""Public harness base identity/forwarding and every frozen authored binding."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class ComponentHarnessBoundaryTests(unittest.TestCase):
    def test_original_and_minimum_public_protocols_and_authored_bindings(self):
        result = subprocess.run(['node', '--max-old-space-size=512', 'tests/component_harness_boundary_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['uses'], 26)
        self.assertEqual(report['files'], 26)
        self.assertEqual(report['subjects'], 3)
        self.assertEqual(report['protocol_cases_per_subject'], 23)
        self.assertEqual(report['mutations'], 45)
        self.assertFalse(report['native_executed'])
