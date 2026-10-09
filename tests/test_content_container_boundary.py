"""Historical content loader semantics and exact menu/tab override context."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class ContentContainerBoundaryTests(unittest.TestCase):
    def test_public_content_protocol_and_owned_root_contexts(self):
        result = subprocess.run(['node', '--max-old-space-size=512', 'tests/content_container_boundary_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['uses'], 11)
        self.assertEqual(report['subclasses'], 12)
        self.assertEqual(report['subjects'], 3)
        self.assertEqual(report['protocol_cases_per_subject'], 34)
        self.assertEqual(report['owned_contexts'], 6)
        self.assertEqual(report['mutations'], 26)
        self.assertFalse(report['native_executed'])
