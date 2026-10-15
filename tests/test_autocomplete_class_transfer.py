# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Public helper identity and original class-transfer method protocols."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AutocompleteClassTransferTests(unittest.TestCase):
    def test_public_helper_and_complete_tagged_setter_preserve_class_transfer(self):
        result = subprocess.run(['node', '--experimental-vm-modules', 'tests/autocomplete_class_transfer_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['frozen_uses'], 1)
        self.assertEqual(observed['subjects'], 3)
        self.assertEqual(observed['helper_cases_per_subject'], 30)
        self.assertEqual(observed['class_transfer_cases_per_subject'], 64)
        self.assertEqual(observed['negative_controls'], 13)
        self.assertTrue(observed['alias_positive'])
        self.assertFalse(observed['whole_component_or_native_or_packed_executed'])
