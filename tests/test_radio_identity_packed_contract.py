# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Mandatory packed mixed-generation radio observation admission."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class PackedRadioIdentityTests(unittest.TestCase):
    def test_observation_collector_writer_and_exact_source_controls(self):
        result = subprocess.run(['node', 'tests/radio_identity_packed_contract_probe.mjs'],
            cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        for field, expected in [('derived_cases', 105), ('retained_previous_cases', 102),
                ('negative_cases', 105), ('collector_mutants', 3), ('writer_cases', 3),
                ('source_reversal_negative_controls', 38)]:
            self.assertEqual(observed[field], expected, field)
        self.assertTrue(observed['roster_bound'])
        self.assertFalse(observed['actual_packed_radio_executed'])
        self.assertFalse(observed['native_browser_executed'])
