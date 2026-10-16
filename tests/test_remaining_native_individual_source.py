# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Three source decisions retain whole-original evidence and mandatory native admission."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RemainingNativeIndividualSourceTests(unittest.TestCase):
    def run_probe(self, name, timeout=60):
        result = subprocess.run(['node', name], cwd=ROOT, capture_output=True,
                                text=True, timeout=timeout)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        return json.loads(result.stdout.strip().splitlines()[-1])

    def test_whole_original_and_current_source_controls(self):
        report = self.run_probe('tests/remaining_native_individual_source_probe.mjs')
        self.assertEqual(report['source_judgments'], 3)
        self.assertEqual(report['whole_original_hunks'], 4)
        self.assertEqual(report['controls'], 391)
        self.assertEqual(report['untouched_other_ledger_entries'], 1694)
        self.assertTrue(report['exact_preceding_ledger_recovered'])
        self.assertFalse(report['actual_current_native_or_packed_or_floor_qualified'])

    def test_exact_framework_replay_source_route(self):
        report = self.run_probe('tests/ripple_replay_route_source_probe.mjs')
        self.assertEqual(report['controls'], 39)
        self.assertEqual(report['helper_catch'], {'main': True, '21.x': False})
        self.assertFalse(report['private_symbols_invoked'])
        self.assertFalse(report['actual_angular_native_or_packed_qualified'])

    def test_real_source_judgments_require_observed_runtime(self):
        report = self.run_probe('tests/upstream/remaining-native-individual-admission.mjs', 180)
        self.assertEqual(report['actual_root_cli_controls'], 19 if report['line'] == '21.x' else 18)
        self.assertTrue(report['real_source_judgments_preserved'])
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])
