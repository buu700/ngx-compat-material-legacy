# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Bounded form-field contracts preserve owned-token identities and release gates."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FormFieldCallerContracts(unittest.TestCase):
    def test_individual_roles_and_current_evidence(self):
        command = ['node', 'tests/form_field_caller_probe.mjs']
        if os.environ.get('NGX_FORM_FIELD_CALLER_DIAGNOSTIC'):
            command.append(os.environ['NGX_FORM_FIELD_CALLER_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['individual_routes'], 18)
        self.assertEqual(report['removed_original_imports'], 11)
        self.assertEqual(report['unused_imports'], 0)
        self.assertEqual(report['current_source_files'], 81)
        self.assertEqual(report['SDK_models'], 3)
        self.assertEqual(report['invalid_type_controls'], 9)
        self.assertEqual(report['constructor_attribute_and_injector_cases'], 128)
        self.assertEqual(report['actual_source_mutants_rejected'], 3)
        self.assertGreaterEqual(report['input_corruptions_rejected'], 20)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertEqual(report['review_row_corruptions_rejected'], 3)
        self.assertTrue(report['alias_allowlist_bytes_preserved'])
        self.assertTrue(report['all1697_1736_315_obligations_and_six_packed_CVA_rows_retained'])
        self.assertIn(report['canonical_closures_integrated'], [0, 18])
        self.assertFalse(report['actual_native_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
