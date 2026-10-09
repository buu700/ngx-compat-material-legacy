"""Genuine public core ElementRef identity and scoped authored imports."""
import json
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class ElementRefUseTests(unittest.TestCase):
    def test_public_modules_fields_tokens_and_current_delta(self):
        result = subprocess.run(['node', '--max-old-space-size=512', 'tests/element_ref_use_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['frozen_uses'], 67)
        self.assertEqual(report['current_uses'], 72)
        self.assertEqual(report['current_delta_uses'], 5)
        self.assertEqual(report['subjects'], 3)
        self.assertEqual(report['protocol_cases_per_subject'], 10)
        self.assertEqual(report['mutations'], 21)
        self.assertGreater(report['angular_constructor_input_references'], 0)
        self.assertFalse(report['native_executed'])
