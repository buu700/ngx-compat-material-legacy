# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Actual collector admission controls; packed Angular execution is a separate gate."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ValueAccessorPackedContractTests(unittest.TestCase):
    def test_actual_collector_requires_each_real_node_and_forms_lifecycle_observation(self):
        result = subprocess.run(['node', 'tests/value_accessor_packed_contract_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['families'], 6)
        self.assertEqual(observed['derived_cases'], 104)
        self.assertEqual(observed['negative_cases'], 157)
        self.assertEqual(observed['collector_mutants'], 2)
        self.assertEqual(observed['writer_cases'], 3)
        self.assertTrue(observed['roster_bound'])
        self.assertFalse(observed['actual_packed_control_instances_executed'])
        self.assertFalse(observed['native_browser_executed'])
