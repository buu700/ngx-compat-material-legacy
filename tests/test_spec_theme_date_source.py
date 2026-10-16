# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Modern M3/date fixture migrations cannot erase retained M2 and legacy harness contracts."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SpecThemeDateSourceTests(unittest.TestCase):
    def test_complete_originals_normalization_and_owned_boundaries(self):
        result = subprocess.run(['node', 'scripts/run-historical-source-probe.mjs', 'theme-date-source'], cwd=ROOT,
                                capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['complete_original_files'], 22)
        self.assertEqual(report['complete_original_hunks'], 94)
        self.assertEqual(report['controls'], 57)
        self.assertEqual(report['unchanged_product_members'], 1141)
        self.assertTrue(report['source_membership_exact'])
        self.assertFalse(report['actual_Angular_Sass_browser_native_packed_or_floor_qualified'])
