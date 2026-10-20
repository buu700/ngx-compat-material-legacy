# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current public module/type evidence leaves whole controls and CVA gates intact."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CdkModuleTypeCallerRoles(unittest.TestCase):
    def test_current_module_type_callers_and_genuine_namespaces(self):
        worksheet = json.loads((ROOT / 'compatibility/rc/cdk-module-type-caller-roles-worksheet.json').read_text())
        integrated = worksheet['source_closures_integrated'] == 14
        command = ['node', 'tests/cdk_module_type_caller_roles_probe.mjs']
        if integrated:
            command.append('--integrated')
        if os.environ.get('NGX_CDK_MODULE_TYPE_DIAGNOSTIC'):
            command.extend(['--out', os.environ['NGX_CDK_MODULE_TYPE_DIAGNOSTIC']])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-10000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['individual_caller_roles'], 14)
        self.assertEqual(report['source_files'], 14)
        self.assertEqual(report['complete_context_members'], 15)
        self.assertEqual(report['public_module_routes'], 3)
        self.assertEqual(report['actual_module_export_only_roles'], 4)
        self.assertEqual(report['unused_type_imports'], 1)
        self.assertEqual(report['strict_public_namespace_models'], 3)
        self.assertEqual(report['negative_type_controls'], 6)
        self.assertEqual(report['finite_runtime_cases'], 42)
        self.assertEqual(report['runtime_fault_controls_rejected'], 12)
        self.assertEqual(report['current_validator_cache_transitions_per_context'], 9)
        self.assertGreater(report['source_and_evidence_corruptions_rejected'], 45)
        self.assertEqual(report['late_source_and_subject_changes_rejected'], 2)
        self.assertEqual(report['canonical_row_corruptions_rejected'], 2)
        self.assertEqual(report['canonical_closures_integrated'], 14 if integrated else 0)
        self.assertEqual(report['all_canonical_ledger_bytes_preserved'], not integrated)
        self.assertTrue(report['all_six_actual_packed_CVA_requirements_retained'])
        self.assertFalse(report['whole_legacy_controls_media_queries_native_styles_or_AOT_metadata_qualified'])
        self.assertFalse(report['actual_native_packed_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
