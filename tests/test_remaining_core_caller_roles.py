# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite Core caller evidence does not qualify complete components or CSP."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RemainingCoreCallerRoles(unittest.TestCase):
    def test_current_callers_and_reused_public_evidence(self):
        command = ['node', 'tests/remaining_core_caller_roles_probe.mjs', '--integrated']
        if os.environ.get('NGX_REMAINING_CORE_DIAGNOSTIC'):
            command.extend(['--out', os.environ['NGX_REMAINING_CORE_DIAGNOSTIC']])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-10000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['individual_caller_roles'], 16)
        self.assertEqual(report['source_files'], 14)
        self.assertEqual(report['complete_context_members'], 28)
        self.assertEqual(report['actual_inject_expressions'], 9)
        self.assertEqual(report['strict_public_namespace_models'], 3)
        self.assertEqual(report['negative_type_controls'], 6)
        self.assertEqual(report['finite_runtime_cases'], 162)
        self.assertEqual(report['runtime_fault_controls_rejected'], 15)
        self.assertFalse(report['prior_whole_inventory_counts_admitted'])
        self.assertEqual(report['current_test_only_reviews'], 2)
        self.assertGreater(report['source_and_evidence_corruptions_rejected'], 35)
        self.assertEqual(report['late_source_and_inventory_changes_rejected'], 2)
        self.assertEqual(report['canonical_row_corruptions_rejected'], 2)
        self.assertEqual(report['canonical_closures_integrated'], 16)
        self.assertFalse(report['all_canonical_ledger_bytes_preserved'])
        self.assertFalse(report['default_nonce_root_factory_or_CSP_security_qualified'])
        self.assertFalse(report['actual_native_packed_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
