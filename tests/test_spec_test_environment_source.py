# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Zone extraction preserves source populations but does not qualify owned native behavior."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SpecTestEnvironmentSourceTests(unittest.TestCase):
    def test_originals_case_bijection_individual_changes_and_owned_boundaries(self):
        result = subprocess.run(['node', 'scripts/run-historical-source-probe.mjs', 'test-environment-zone-source'], cwd=ROOT,
                                capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['complete_original_files'], 36)
        self.assertEqual(report['complete_original_hunks'], 1347)
        self.assertEqual(report['qualified_zone_source_decisions'], 2)
        self.assertEqual(report['qualified_zone_hunks'], 672)
        self.assertEqual(report['zone_static_it_occurrences'], 645)
        self.assertEqual(report['zone_moves_preserved'], 6)
        self.assertEqual(report['individual_case_changes_reviewed'], 6)
        self.assertEqual(report['global_programs_checked'], 13)
        self.assertEqual(report['extracted_helpers_checked'], 12)
        self.assertEqual(report['scheduler_helpers_reviewed'], 2)
        self.assertEqual(report['standalone_decisions_pending'], 2)
        self.assertEqual(report['standalone_hunks_pending'], 675)
        self.assertEqual(report['controls'], 73)
        self.assertEqual(report['unchanged_product_members'], 1141)
        self.assertFalse(report['actual_Angular_browser_native_packed_or_floor_qualified'])
