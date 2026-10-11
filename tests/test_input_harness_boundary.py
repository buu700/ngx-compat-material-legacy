# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Legacy native input behavior against authenticated public harness modules."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class InputHarnessBoundaryTests(unittest.TestCase):
    def test_native_property_contract_and_public_subtype(self):
        result = subprocess.run(
            ['node', '--experimental-vm-modules', '--max-old-space-size=768',
             'tests/input_harness_boundary_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(len(report['mutation_rejections']), 5)
        for contracts in report['contracts']:
            self.assertEqual(len(contracts['unchanged_methods']) +
                             len(contracts['changed_methods']), 29)
            self.assertEqual(len(contracts['changed_methods']),
                             0 if contracts['line'] == 'original' else 3)
        for observation in report['observations']:
            count = 27 if observation['line'] == 'original' else 30
            self.assertEqual(len(observation['input']['cases']), count)
            self.assertEqual(len(observation['native_select_and_option']['cases']), count)
            self.assertFalse(observation['input']['native_browser_executed'])
            if observation['adapter']:
                self.assertFalse(observation['adapter']['constructor_equals_current_parent'])
                self.assertTrue(observation['adapter']['current_parent_subtype_preserved'])
        for types in report['strict_types']['results']:
            self.assertTrue(types['strict'])
            self.assertFalse(types['skip_lib_check'])
            self.assertEqual(types['negative_controls'], 6)
        self.assertEqual(report['g11_claim'], 'not-passed')
