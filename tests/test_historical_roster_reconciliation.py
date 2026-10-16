# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Three retained regressions strengthen complete native admission without product edits."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class HistoricalRosterReconciliationTests(unittest.TestCase):
    def test_current_writer_validator_and_source_footprint_controls(self):
        result = subprocess.run(['node', 'tests/historical_roster_reconciliation_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['positive_current_writer_validator_controls'], 3)
        self.assertEqual(report['native_protocol_rejection_controls'], 69)
        self.assertEqual(report['source_scope_rejection_controls'], 7)
        self.assertEqual(report['required_full_historical_ids'], 2228)
        self.assertEqual(report['original_component_ids_preserved'], 2220)
        self.assertEqual(report['original_named_native_cases_preserved'], 7)
        self.assertEqual(report['new_required_regression_cases'], 3)
        self.assertTrue(report['native20_original_definitions_preserved'])
        self.assertTrue(report['all20_proposed_bindings_missing_coordinator_run'])
        self.assertFalse(report['actual_native_browser_library_or_floor_execution'])
        self.assertTrue(report['fixture_only'])
