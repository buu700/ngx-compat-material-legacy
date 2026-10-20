# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Named public service contracts leave media/CSP/native/CVA gates intact."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class LayoutServiceCallerRoles(unittest.TestCase):
    def test_current_callers_and_genuine_public_services(self):
        worksheet = json.loads((ROOT / 'compatibility/rc/layout-service-caller-roles-worksheet.json').read_text())
        integrated = worksheet['source_closures_integrated'] == 13
        command = ['node', 'tests/layout_service_caller_roles_probe.mjs']
        if integrated:
            command.append('--integrated')
        if os.environ.get('NGX_LAYOUT_SERVICE_DIAGNOSTIC'):
            command.extend(['--out', os.environ['NGX_LAYOUT_SERVICE_DIAGNOSTIC']])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-10000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['individual_caller_roles'], 13)
        self.assertEqual(report['source_files'], 7)
        self.assertEqual(report['complete_context_members'], 15)
        self.assertEqual(report['exact_consumed_call_expressions'], 6)
        self.assertEqual(report['unused_layout_imports'], 2)
        self.assertEqual(report['ignored_optional_Location_body_reads'], 0)
        self.assertEqual(report['strict_public_namespace_models'], 3)
        self.assertEqual(report['negative_type_controls'], 6)
        self.assertEqual(report['finite_runtime_cases'], 90)
        self.assertEqual(report['runtime_fault_controls_rejected'], 12)
        self.assertEqual(report['genuine_zoneful_contexts'], 6)
        self.assertEqual(report['genuine_zoneless_contexts'], 4)
        self.assertGreater(report['source_and_evidence_corruptions_rejected'], 40)
        self.assertEqual(report['late_source_and_subject_changes_rejected'], 2)
        self.assertEqual(report['canonical_row_corruptions_rejected'], 2)
        self.assertEqual(report['canonical_closures_integrated'], 13 if integrated else 0)
        self.assertEqual(report['all_canonical_ledger_bytes_preserved'], not integrated)
        self.assertTrue(report['all_six_actual_packed_CVA_requirements_retained'])
        self.assertFalse(report['whole_legacy_controls_media_preferences_native_styles_or_AOT_metadata_qualified'])
        self.assertFalse(report['actual_native_packed_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
