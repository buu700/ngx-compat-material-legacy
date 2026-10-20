# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Five finite type/token caller reviews do not grant whole-component clearance."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreTokenCallerRoles(unittest.TestCase):
    def test_current_callers_and_authenticated_evidence(self):
        command = ['node', 'tests/core_token_caller_roles_probe.mjs', '--integrated']
        if os.environ.get('NGX_CORE_TOKEN_CALLERS_DIAGNOSTIC'):
            command.extend(['--out', os.environ['NGX_CORE_TOKEN_CALLERS_DIAGNOSTIC']])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-10000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['individual_caller_roles'], 5)
        self.assertEqual(report['complete_context_members'], 11)
        self.assertEqual(report['strict_public_namespace_models'], 3)
        self.assertEqual(report['negative_type_controls'], 9)
        self.assertEqual(report['genuine_Core_runtime_contexts'], 6)
        self.assertEqual(report['finite_runtime_cases'], 72)
        self.assertEqual(report['runtime_fault_controls_rejected'], 12)
        self.assertTrue(report['exact_existing_EventEmitter_review_reused'])
        self.assertGreater(report['source_and_evidence_corruptions_rejected'], 30)
        self.assertTrue(report['late_source_change_rejected'])
        self.assertTrue(report['canonical_row_corruption_rejected'])
        self.assertEqual(report['canonical_closures_integrated'], 5)
        self.assertFalse(report['all_canonical_ledger_bytes_preserved'])
        self.assertFalse(report['full_Material_dialog_menu_declaration_closures_compiled'])
        self.assertFalse(report['actual_native_packed_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
