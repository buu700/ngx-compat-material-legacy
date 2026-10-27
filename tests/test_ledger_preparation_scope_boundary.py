# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Preparation scope validation remains mandatory at each observable boundary."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class LedgerPreparationScopeBoundaryTests(unittest.TestCase):
    def test_scope_changes_and_returned_reader_are_guarded(self):
        result = subprocess.run(
            ['node', 'tests/ledger_preparation_scope_boundary_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['rejections'], 5)
        for field in ['actual_canonical_after_preserved',
                      'reused_scope_checked_on_preparation_entry',
                      'scope_changes_during_preparation_rejected',
                      'returned_reader_late_gate_preserved',
                      'current_reader_identity_preserved']:
            self.assertTrue(report[field], field)
        self.assertEqual(report['original_test_timeouts_or_assertions_changed'], 0)
        self.assertFalse(report['actual_native_artifact_browser_floor_or_audit_qualified'])
