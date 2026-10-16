# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""The historical adapter emits a stable, numerically identical public strategy."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class WideFixtureAdapterTests(unittest.TestCase):
    def test_actual_adapter_and_historical_metadata_against_both_minima(self):
        result = subprocess.run(['node', 'tests/spec_wide_fixture_adapter_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['actual_adapter_output_witnesses'], 12 if report['line'] == 'main' else 11)
        self.assertEqual(report['actual_historical_metadata_witnesses'], 9 if report['line'] == 'main' else 8)
        self.assertEqual(report['rejection_controls'], 7)
        self.assertTrue(report['original_complete_adapter_loaded_unchanged'])
        self.assertEqual([n['version'] for n in report['minimum_public_Eager_identity']], ['22.1.7', '21.2.23'])
        self.assertEqual(report['owned_product_members_preserved'], 1141)
        self.assertEqual(report['current_owned_cases_preserved'], 2223)
        self.assertFalse(report['actual_Angular_native_artifact_or_floor_qualified'])

    def test_original_validators_and_bounded_source_binding_transition(self):
        result = subprocess.run(['node', 'tests/spec_wide_fixture_adapter_qualification_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['qualified_entries'], 13)
        self.assertEqual(report['unrelated_rows_preserved'], 1684)
        self.assertEqual(report['scope_rejection_controls'], 7)
        self.assertEqual(report['native_rejection_controls'], 15)
        self.assertTrue(report['all1697_verdicts_unchanged'])
        self.assertFalse(report['actual_Angular_native_artifact_or_floor_qualified'])
