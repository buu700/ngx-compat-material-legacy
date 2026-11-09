# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Bounded tabs contracts preserve private-token removal and release gates."""
import json
import os
from pathlib import Path
import subprocess
import unittest
from tabs_caller_route import tabs_line, probe_for

ROOT = Path(__file__).resolve().parents[1]


class TabsCallerContracts(unittest.TestCase):
    def test_individual_roles_and_current_evidence(self):
        line = tabs_line()
        command = ['node', probe_for(line)]
        if os.environ.get('NGX_TABS_CALLER_DIAGNOSTIC'):
            command.append(os.environ['NGX_TABS_CALLER_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['individual_routes'], 21)
        self.assertEqual(report['removed_current_private_imports'], 1)
        self.assertEqual(report['unused_imports'], 4)
        self.assertEqual(report['current_source_files'], 68 if line == 'main' else 69)
        if line == 'main':
            self.assertEqual(report['historical_source_files'], 69)
            self.assertEqual(report['enabled_focus_mutants_rejected'], 1)
        self.assertEqual(report['SDK_models'], 3)
        self.assertEqual(report['invalid_type_controls'], 9)
        self.assertEqual(report['constructor_config_cases'], 68)
        self.assertEqual(report['actual_source_mutants_rejected'], 4)
        self.assertGreaterEqual(report['input_corruptions_rejected'], 20)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertEqual(report['review_row_corruptions_rejected'], 3)
        self.assertTrue(report['historical_alias_allowlist_bytes_preserved'] if line == 'main' else report['alias_allowlist_bytes_preserved'])
        self.assertTrue(report['all1697_1736_315_obligations_and_six_packed_CVA_rows_retained'])
        if line == 'main':
            self.assertEqual(report['historical_prepared'], 21)
            self.assertEqual(report['baseline_reviewed'], 13)
            self.assertEqual(report['baseline_insufficient'], 8)
            self.assertEqual(report['recovered_roles'], 8)
            self.assertEqual(report['current_reviewed'], 21)
            self.assertEqual(report['current_insufficient'], 0)
        else:
            self.assertIn(report['canonical_closures_integrated'], [0, 21])
        self.assertFalse(report['actual_native_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
