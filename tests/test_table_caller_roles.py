# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Named public table contracts retain packed/AOT/native/CVA gates."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TableCallerRoles(unittest.TestCase):
    def test_current_callers_and_genuine_public_tables(self):
        worksheet = json.loads((ROOT / 'compatibility/rc/table-caller-roles-worksheet.json').read_text())
        integrated = worksheet['source_closures_integrated'] == 26
        command = ['node', 'tests/table_caller_roles_probe.mjs']
        if integrated:
            command.append('--integrated')
        if os.environ.get('NGX_TABLE_CALLER_DIAGNOSTIC'):
            command.extend(['--out', os.environ['NGX_TABLE_CALLER_DIAGNOSTIC']])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-10000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['individual_caller_roles'], 26)
        self.assertEqual(report['source_files'], 7)
        self.assertEqual(report['whole_relative_source_closure'], 11)
        self.assertEqual(report['complete_context_members'], 51)
        self.assertEqual(report['removed_private_imports'], 1)
        self.assertEqual(report['strict_public_namespace_models'], 3)
        self.assertEqual(report['exact_current_zero_argument_parent_signatures'], 18)
        self.assertEqual(report['negative_type_controls'], 6)
        self.assertEqual(report['finite_runtime_cases'], 148)
        self.assertEqual(report['runtime_fault_controls_rejected'], 12)
        self.assertEqual(report['genuine_Angular_runtime_contexts'], 6)
        self.assertGreater(report['source_and_evidence_corruptions_rejected'], 40)
        self.assertEqual(report['late_source_and_subject_changes_rejected'], 2)
        self.assertEqual(report['canonical_row_corruptions_rejected'], 2)
        self.assertEqual(report['canonical_closures_integrated'], 26 if integrated else 0)
        self.assertEqual(report['all_canonical_ledger_bytes_preserved'], not integrated)
        self.assertTrue(report['all_six_actual_packed_CVA_requirements_retained'])
        self.assertFalse(report['whole_owned_table_module_AOT_metadata_native_style_or_geometry_qualified'])
        self.assertFalse(report['actual_native_packed_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
