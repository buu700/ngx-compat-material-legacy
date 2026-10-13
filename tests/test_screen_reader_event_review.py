"""Actual public screen-reader helpers and historical menu origin handlers."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ScreenReaderEventReviewTests(unittest.TestCase):
    def test_real_public_exports_and_owned_handlers_reject_regressions(self):
        result = subprocess.run(['node', '--experimental-vm-modules',
            'tests/screen_reader_event_review_probe.mjs'], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        body = json.loads(result.stdout)
        self.assertEqual(body['public_subjects'], 3)
        self.assertEqual(body['frozen_uses'], 4)
        self.assertEqual(body['helper_cases_per_subject'], 169)
        self.assertEqual(body['owned_menu_cases_per_subject'], 44)
        self.assertEqual(body['negative_controls'], 12)
        self.assertTrue(body['alias_positive'])
        self.assertFalse(body['whole_angular_class_constructed'])
        self.assertFalse(body['native_or_packed_qualified'])
        self.assertEqual(body['g11_claim'], 'not-passed')
