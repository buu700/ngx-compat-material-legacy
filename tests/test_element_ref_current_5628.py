# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Current public ElementRef source census and bounded reviews."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ElementRefCurrentReview(unittest.TestCase):
    def run_probe(self, path):
        result = subprocess.run(['node', path], cwd=ROOT, capture_output=True,
                                text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return json.loads(result.stdout.strip().splitlines()[-1])

    def test_full_current_source_census(self):
        report = self.run_probe('tests/element_ref_current_5628_probe.mjs')
        self.assertEqual((report['frozen_uses'], report['current_uses'],
                          report['current_delta_uses']), (67, 75, 8))
        self.assertEqual(report['mutations'], 25)
        self.assertFalse(report['native_executed'])

    def test_source_admission_and_transitions(self):
        report = self.run_probe('tests/element_ref_current_5628_admission_probe.mjs')
        self.assertEqual((report['selected'], report['transitions']), (12, 14))
        self.assertTrue(report['source_only_result'])
        self.assertTrue(report['semantic_review_required'])
