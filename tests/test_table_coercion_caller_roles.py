# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Only the three independently reviewed pure helper routes receive credit."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TableCoercionCallerRoles(unittest.TestCase):
    def test_public_minimum_behavior_and_complete_current_callers(self):
        result = subprocess.run(['node', 'tests/table_coercion_caller_roles_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['individual_caller_roles'], 3)
        self.assertEqual(report['complete_current_setters'], 6)
        self.assertEqual(report['public_tagged_and_minimum_namespaces'], 3)
        self.assertEqual(report['genuine_boolean_cases_each'], 42)
        self.assertGreater(report['source_and_evidence_corruptions_rejected'], 25)
        self.assertTrue(report['late_source_change_rejected'])
        self.assertEqual(len(report['boolean_behavior_faults_rejected']), 3)
        self.assertEqual(report['canonical_closures_integrated'], 0)
        self.assertTrue(report['all_canonical_ledger_bytes_preserved'])
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
