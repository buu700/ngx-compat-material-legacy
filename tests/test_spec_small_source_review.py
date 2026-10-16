# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Original spec changes need semantic review; both legacy grouped fixtures need real labels."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SmallSpecSourceTests(unittest.TestCase):
    def test_complete_originals_and_owned_fixture_data(self):
        result = subprocess.run(['node', 'tests/spec_small_source_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['complete_original_files'], 6)
        self.assertEqual(report['complete_original_hunks'], 13)
        self.assertEqual(report['controls'], 48)
        self.assertEqual(report['unchanged_other_product_members'], 1140)
        self.assertEqual(report['derived_historical_cases'], 2220)
        self.assertEqual(report['discovery_controls'], 5)
        self.assertEqual(report['complete_required_historical_cells'], 2225)
        self.assertTrue(report['original_case_ids_order_and_names_unchanged'])
        self.assertTrue(report['source_context_requalification_required'])
        self.assertFalse(report['actual_Angular_native_packed_or_floor_qualified'])
