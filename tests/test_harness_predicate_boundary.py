"""Public predicate behavior and exact owned import contracts."""
import json
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class HarnessPredicateBoundaryTests(unittest.TestCase):
    def test_actual_peer_predicates_and_authored_uses(self):
        result = subprocess.run(['node', '--max-old-space-size=512', 'tests/harness_predicate_boundary_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['uses'], 49)
        self.assertEqual(report['population'], {'erased-type': 63, 'direct-factory-construction': 45, 'static-string-matcher': 25})
        self.assertEqual(report['subjects'], 3)
        self.assertEqual(report['protocol_cases_per_subject'], 14)
        self.assertEqual(report['mutations'], 36)
        self.assertFalse(report['native_executed'])
