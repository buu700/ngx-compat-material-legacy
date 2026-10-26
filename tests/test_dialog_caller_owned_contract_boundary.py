# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact raw source admission and complete immutable contract evidence."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DialogOwnedContractBoundary(unittest.TestCase):
    def test_changed_or_historical_source_cannot_admit_current_contract(self):
        result = subprocess.run(['node', 'tests/dialog_caller_owned_contract_boundary_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-10000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['runtime_cases'], 162)
        self.assertEqual(report['real_source_faults'], 5)
        self.assertEqual(report['modeled_semantic_sources'], 49)
        self.assertEqual(report['public_peer_member_declarations_checked'], 3)
        self.assertTrue(report['class_signatures_unchanged_except_componentRef'])
        self.assertEqual(report['raw_before_admission_rejected'], 1)
        self.assertEqual(report['partial_applications_rejected'], 4)
        self.assertEqual(report['corruptions_rejected'], 9)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertEqual(report['canonical_ledgers_unchanged'], 3)
        self.assertEqual(report['source_closures'], 0)
        self.assertFalse(report['actual_native_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
