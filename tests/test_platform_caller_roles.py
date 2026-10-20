# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Only individually reviewed public Platform token/field routes receive credit."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PlatformCallerRoles(unittest.TestCase):
    def test_current_callers_public_peers_and_evidence_guards(self):
        command = ['node', 'tests/platform_caller_roles_probe.mjs', '--integrated']
        if os.environ.get('NGX_PLATFORM_CALLERS_DIAGNOSTIC'):
            command.extend(['--out', os.environ['NGX_PLATFORM_CALLERS_DIAGNOSTIC']])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-10000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['individual_caller_roles'], 4)
        self.assertEqual(report['complete_context_members'], 11)
        self.assertEqual(report['public_flag_reads'], 7)
        self.assertEqual(report['strict_public_namespace_models'], 3)
        self.assertEqual(report['genuine_public_factory_cases'], 39)
        self.assertEqual(report['compatibility_constructor_calls'], 0)
        # Integration replaces the three preparation-only whole-ledger byte guards.
        self.assertEqual(report['source_and_evidence_corruptions_rejected'], 25)
        self.assertTrue(report['canonical_row_corruption_rejected'])
        self.assertTrue(report['late_source_change_rejected'])
        self.assertEqual(report['selected_owned_predicate_protocol_cases'], 16)
        self.assertEqual(len(report['incorrect_predicate_faults_rejected']), 2)
        self.assertTrue(report['inherited_synthetic_viewport_edge_preserved'])
        self.assertEqual(report['canonical_closures_integrated'], 4)
        self.assertFalse(report['all_canonical_ledger_bytes_preserved'])
        self.assertFalse(report['actual_full_viewport_dialog_date_component_native_packed_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
