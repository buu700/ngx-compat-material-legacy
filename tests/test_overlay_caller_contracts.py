# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Actual current overlay call contracts retain native/packed/CVA gates."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class OverlayCallerContracts(unittest.TestCase):
    def test_complete_current_source_and_individual_decisions(self):
        command = ['node', 'tests/overlay_caller_contracts_probe.mjs']
        if os.environ.get('NGX_OVERLAY_CONTRACT_DIAGNOSTIC'):
            command.append(os.environ['NGX_OVERLAY_CONTRACT_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['reviewed_routes'], 48)
        self.assertEqual(report['current_source_files'], 145)
        self.assertEqual(report['selected_minimum_resolved_calls'], 104)
        self.assertEqual(report['selected_minimum_member_accesses'], 142)
        self.assertEqual(report['justified_strategy_casts'], 5)
        self.assertEqual(report['actual_source_faults_rejected'], 3)
        self.assertEqual(report['runtime_protocol_cases'], 160)
        self.assertGreaterEqual(report['source_or_evidence_corruptions_rejected'], 20)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertEqual(report['review_row_corruptions_rejected'], 3)
        self.assertEqual(report['mutable_source_owner_registry_dependencies'], 0)
        self.assertIn(report['canonical_closures_integrated'], [0, 48])
        self.assertTrue(report['all1697_1736_315_obligations_and_six_packed_CVA_rows_retained'])
        self.assertFalse(report['actual_native_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
