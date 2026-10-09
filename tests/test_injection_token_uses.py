"""Stable public InjectionToken constructor and unique owned token contracts."""
import json
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class InjectionTokenUseTests(unittest.TestCase):
    def test_public_tokens_overloads_factories_and_current_delta(self):
        result = subprocess.run(['node', '--max-old-space-size=512', 'tests/injection_token_use_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['frozen_uses'], 20)
        self.assertEqual(report['current_uses'], 25)
        self.assertEqual(report['current_delta_uses'], 5)
        self.assertEqual(report['owned_tokens_per_subject'], 27)
        self.assertEqual(report['protocol_cases_per_subject'], 9)
        self.assertEqual(report['unused_imports'], 5)
        self.assertEqual(report['mutations'], 18)
        self.assertFalse(report['native_executed'])
