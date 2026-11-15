# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Source-only a11y/platform successors; no component or floor qualification."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class A11yPlatformCdeeSourceTests(unittest.TestCase):
    def test_separate_composable_successors(self):
        for family, expected in (('focus-monitor', 6), ('platform', 6), ('a11y-platform-roles', 8), ('a11y-unchanged-callers', 7), ('radio-snack-unchanged', 3)):
            with self.subTest(family=family):
                result = subprocess.run(['node', f'tests/upstream/{family}-cdee-source-successor.mjs'],
                                        cwd=ROOT, capture_output=True, text=True, timeout=120)
                self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
                report = json.loads(result.stdout.strip().splitlines()[-1])
                self.assertEqual(report['rows'], expected)
                self.assertEqual(report['source_reviewed'], expected)
                self.assertEqual(report['selected_mutations_rejected'], 3)
                self.assertEqual(report['source_corruptions_rejected'], 3)
                self.assertTrue(report['unrelated_live_row_preserved'])
                self.assertFalse(report['actual_native_packed_or_floor_qualified'])
                self.assertEqual(report['g11_claim'], 'not-passed')

    def test_installed_minimum_and_git_version_guard(self):
        result = subprocess.run(['node', 'tests/upstream/a11y-platform-environment-cdee.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['installed_cdk'], '22.1.7')
        self.assertEqual(report['members'], 127)
        self.assertEqual(report['wrong_git_rejected_before_source_reads'], 5)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])
