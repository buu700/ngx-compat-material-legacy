# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Selected class decorator source review and installed minimum subjects."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FrameworkClassSelectedReview(unittest.TestCase):
    def run_probe(self, path):
        result = subprocess.run(['node', path], cwd=ROOT, capture_output=True,
                                text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return json.loads(result.stdout.strip().splitlines()[-1])

    def test_source_roles_and_semantic_controls(self):
        report = self.run_probe('tests/framework_class_5628_source_probe.mjs')
        self.assertEqual(report['cases'], 17)
        self.assertEqual(report['references'], 30)
        self.assertTrue(report['prior_roles_identical'])
        self.assertEqual(len(report['mutations']), 4)

    def test_installed_minimum_members(self):
        report = self.run_probe('tests/framework_class_5628_minimum_probe.mjs')
        self.assertEqual(report['version'], '22.1.7')
        self.assertEqual(report['members'], 27)
        self.assertEqual(len(report['mutations']), 4)

    def test_source_admission_and_transitions(self):
        report = self.run_probe('tests/framework_class_5628_admission_probe.mjs')
        self.assertEqual(report['selected'], 17)
        self.assertEqual(report['transitions'], 14)
        self.assertTrue(report['source_only_result'])
        self.assertTrue(report['semantic_review_required'])
