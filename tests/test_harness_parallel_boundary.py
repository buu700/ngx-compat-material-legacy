"""Public parallel ordering,async batch lifecycle and exact owned factory inputs."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class HarnessParallelBoundaryTests(unittest.TestCase):
    def test_actual_peer_batches_and_authored_factories(self):
        result = subprocess.run(['node', '--max-old-space-size=512', 'tests/harness_parallel_boundary_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['uses'], 14)
        self.assertEqual(report['calls'], 30)
        self.assertEqual(report['subjects'], 3)
        self.assertEqual(report['protocol_cases_per_subject'], 8)
        self.assertEqual(report['mutations'], 23)
        self.assertFalse(report['native_executed'])
