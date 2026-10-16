# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Two appended regressions cannot waive prior source verdicts or native gates."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SpecControlContextTests(unittest.TestCase):
    def test_original_scope_readers_source_bindings_and_rejection_controls(self):
        result = subprocess.run(['node', 'scripts/run-historical-source-probe.mjs', 'control-case-context'], cwd=ROOT,
                                capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['source_scope_rows'], 83)
        self.assertEqual(report['native_source_bindings'], 20)
        self.assertEqual(report['changed_native_source_sets'], 7)
        self.assertEqual(report['generic_source_records'], 10)
        self.assertEqual(report['qualified_entries'], 113)
        self.assertEqual(report['proposed_writes'], 38)
        self.assertEqual(report['controls'], 128)
        self.assertEqual(report['original_cases_preserved'], 2220)
        self.assertEqual(report['additional_cases'], 2)
        self.assertEqual(report['current_case_cells'], 2227)
        self.assertEqual(report['untouched_other_ledger_entries'], 1584)
        self.assertTrue(report['all1697_dispositions_and_authored_statuses_preserved'])
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])
