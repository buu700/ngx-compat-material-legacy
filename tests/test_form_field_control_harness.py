# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Shared public marker inheritance and exact authored form-field routes."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FormFieldControlHarnessTests(unittest.TestCase):
    def test_public_marker_and_exact_owned_boundaries(self):
        result = subprocess.run(
            ['node', '--experimental-vm-modules', '--max-old-space-size=768',
             'tests/form_field_control_harness_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(len(report['cases']), 3)
        self.assertEqual(len(report['caller_mutation_rejections']), 7)
        self.assertEqual(report['historical_alias']['alias'], 'MatLegacyFormFieldControlHarness')
        self.assertTrue(report['erased_form_field_marker_import'])
        self.assertEqual(len(report['observations']), 3)
        for observation in report['observations']:
            self.assertEqual(len(observation['public_base']['cases']), 23)
            self.assertTrue(observation['owned_select']['marker_instance_identity'])
            self.assertFalse(observation['owned_select']['native_execution'])
        for types in report['strict_types']:
            self.assertTrue(types['strict'])
            self.assertFalse(types['skip_lib_check'])
            self.assertTrue(types['actual_owned_select_source_compiled'])
            self.assertEqual(types['negative_controls'], 5)
        self.assertEqual(report['g11_claim'], 'not-passed')
