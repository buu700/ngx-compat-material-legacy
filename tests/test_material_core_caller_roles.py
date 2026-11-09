# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite Material dependencies do not qualify full legacy controls or native styles."""
import json
import os
from pathlib import Path
import subprocess
import unittest
from material_core_current_route import material_core_route

ROOT = Path(__file__).resolve().parents[1]


class MaterialCoreCallerRoles(unittest.TestCase):
    def test_current_callers_and_genuine_public_evidence(self):
        worksheet = json.loads((ROOT / 'compatibility/rc/material-core-caller-roles-worksheet.json').read_text())
        integrated = worksheet['source_closures_integrated'] == 37
        line, probe = material_core_route()
        command = ['node', probe]
        if integrated and line == '21.x':
            command.append('--integrated')
        if os.environ.get('NGX_MATERIAL_CORE_DIAGNOSTIC'):
            command.extend(['--out', os.environ['NGX_MATERIAL_CORE_DIAGNOSTIC']])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-10000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['individual_caller_roles'], 37)
        self.assertEqual(report['source_files'], 20)
        self.assertEqual(report['complete_context_members'], 39)
        self.assertEqual(report['finite_public_aliases'], 14)
        self.assertEqual(report['unused_imports'], 1)
        self.assertEqual(report['strict_public_namespace_models'], 3)
        self.assertEqual(report['negative_type_controls'], 6)
        self.assertEqual(report['finite_runtime_cases'], 60)
        self.assertEqual(report['runtime_fault_controls_rejected'], 6)
        self.assertGreater(report['source_and_evidence_corruptions_rejected'], 35)
        self.assertEqual(report['late_source_and_public_proof_changes_rejected'], 2)
        self.assertEqual(report['canonical_row_corruptions_rejected'], 2)
        if line == 'main':
            self.assertEqual(report['historical_prepared_roles'], 37)
            self.assertEqual(report['current_valid_roles'], 37)
            self.assertEqual(report['progress_default_token'], 'tagged and current public peer identity independently executed')
        else:
            self.assertEqual(report['canonical_closures_integrated'], 37 if integrated else 0)
            self.assertEqual(report['all_canonical_ledger_bytes_preserved'], not integrated)
        self.assertFalse(report['whole_legacy_controls_native_styles_or_AOT_metadata_qualified'])
        self.assertFalse(report['actual_native_packed_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
