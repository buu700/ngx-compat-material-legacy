# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Admission regressions, without claiming actual packed Angular execution."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TableOnPushPackedContractTests(unittest.TestCase):
    def test_requires_bound_attributes_stable_input_transitions_and_destroy(self):
        result = subprocess.run(['node', 'tests/table_onpush_packed_contract_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['derived_cases'], 105)
        self.assertEqual(observed['collector_mutants'], 2)
        self.assertEqual(observed['writer_cases'], 3)
        self.assertGreaterEqual(observed['negative_cases'], 50)
        self.assertEqual(observed['source_reversal_negative_controls'], 14)
        self.assertTrue(observed['roster_bound'])
        self.assertFalse(observed['actual_packed_table_executed'])
        self.assertFalse(observed['native_browser_executed'])
