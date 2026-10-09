"""Public erased testing contracts and removed factory alias boundaries."""
import json
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class HarnessErasedTypesTests(unittest.TestCase):
    def test_exact_import_and_removed_alias_contracts(self):
        result = subprocess.run(['node', '--max-old-space-size=512', 'tests/harness_erased_types_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['uses'], 33)
        self.assertEqual(report['expanded_factory_members'], 21)
        self.assertEqual(report['subjects'], 3)
        self.assertEqual(report['mutations'], 9)
        self.assertEqual(report['strict_negative_checks'], 7)
        self.assertFalse(report['native_executed'])
