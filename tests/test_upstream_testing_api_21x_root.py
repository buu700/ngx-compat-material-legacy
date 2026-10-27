# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Seven actual root CLI admissions; no full-ledger/native gate claim."""
import json
from pathlib import Path
import subprocess
import unittest
import sys

ROOT = Path(__file__).resolve().parents[1]


class UpstreamTestingApi21xRootTests(unittest.TestCase):
    def test_real_cli_and_missing_marker_mutation_control(self):
        result = subprocess.run(['node', 'tests/upstream_testing_api_21x_root_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        for field, expected in [('actual_CLI_cases', 3), ('individual_reviews', 7),
                                ('original_frozen_uses', 1736), ('additional_obligations', 315),
                                ('missing_marker_entries_rejected', 7), ('mandatory_guard_mutants_detected', 1),
                                ('fresh_inherited_cases', 55)]:
            self.assertEqual(report[field], expected, field)
        self.assertTrue(report['root_mandatory_SHA_hook_covered'])
        self.assertFalse(report['full_1697_audit_executed'])
        self.assertFalse(report['current_native_packed_or_floor_or_g11_credit'])

    def test_independent_exact_ledger_patch(self):
        result = subprocess.run([sys.executable, 'tests/upstream_testing_api_21x_ledger_patch.py'],
                                cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['entries'], 1697)
        self.assertEqual(report['individual_decisions_changed'], 7)
        self.assertEqual(report['existing_checker_proof_digests_changed'], 3)
        self.assertEqual(report['unrelated_entry_or_byte_changes'], 0)
        self.assertFalse(report['full_native_floor_or_g11_qualified'])
