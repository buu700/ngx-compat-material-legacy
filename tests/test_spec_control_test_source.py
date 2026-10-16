# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Original sort, empty-options, exhaustive-check and chip-focus patches need distinct decisions."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SpecControlTestSourceTests(unittest.TestCase):
    def test_complete_originals_retained_regressions_and_floor_source(self):
        result = subprocess.run(['node', 'scripts/run-historical-source-probe.mjs', 'control-test-source'], cwd=ROOT,
                                capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['complete_original_files'], 4)
        self.assertEqual(report['complete_original_hunks'], 18)
        self.assertEqual(report['controls'], 42)
        self.assertEqual(report['unchanged_product_members'], 1141)
        self.assertTrue(report['source_membership_exact'])
        self.assertFalse(report['actual_new_Angular_cases_executed'])
        self.assertFalse(report['actual_Angular_browser_native_packed_or_floor_qualified'])
