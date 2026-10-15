# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Packed identity admission must reject missing targets and weakened collectors."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class GeneratedIdentityPackedContractTests(unittest.TestCase):
    def test_real_collector_writer_and_source_guards(self):
        result = subprocess.run(['node', 'tests/generated_identity_packed_contract_probe.mjs'],
            cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        for field, expected in [('derived_cases', 105), ('retained_previous_cases', 103),
                ('negative_cases', 1174), ('collector_mutants', 3), ('writer_cases', 3),
                ('source_reversal_negative_controls', 50)]:
            self.assertEqual(observed[field], expected, field)
        self.assertTrue(observed['roster_bound'])
        self.assertFalse(observed['actual_packed_generated_identity_executed'])
        self.assertFalse(observed['native_browser_executed'])
