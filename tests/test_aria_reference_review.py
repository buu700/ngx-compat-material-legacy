"""Public ARIA id-list behavior and exact owned modal ownership methods."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AriaReferenceReviewTests(unittest.TestCase):
    def test_original_semantics_and_owned_cleanup_reject_regressions(self):
        result = subprocess.run(['node', '--experimental-vm-modules',
            'tests/aria_reference_review_probe.mjs'], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        body = json.loads(result.stdout)
        self.assertEqual(body['frozen_uses'], 4)
        self.assertEqual(body['public_subjects'], 3)
        self.assertEqual(body['primitive_string_cases_per_peer'], 192)
        self.assertEqual(body['optimization_checks_per_peer'], 2)
        self.assertEqual(body['exact_owned_method_replays'], 6)
        self.assertEqual(body['ownership_transitions_per_replay'], 8)
        self.assertEqual(body['negative_controls'], 8)
        self.assertTrue(body['alias_positive'])
        self.assertFalse(body['native_or_packed_qualified'])
        self.assertEqual(body['g11_claim'], 'not-passed')
