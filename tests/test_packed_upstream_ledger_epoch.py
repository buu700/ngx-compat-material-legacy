# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current ledger admission does not overwrite historical source evidence."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PackedUpstreamLedgerEpochTests(unittest.TestCase):
    def test_current_subjects_gate_the_exact_historical_ledger(self):
        result = subprocess.run(['node', 'tests/packed_upstream_ledger_epoch_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(len(report['cases']), 7)
        self.assertEqual(len(report['rejected']), 28 if report['line'] == '21.x' else 25)
        self.assertEqual(report['original_dispositions_changed'], 16 if report['line'] == '21.x' else 9)
        self.assertEqual(report['canonical_entries'], 1697)
        self.assertEqual(report['changed_scalar_tokens'], 179)
        self.assertFalse(report['current_native_packed_or_floor_or_g11_credit'])
