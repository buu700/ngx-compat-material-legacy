# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Finite input-family source/roster metadata; no runtime qualification."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class InputFirstCheckInventoryMatrixTests(unittest.TestCase):
    def test_current_input_source_and_required_cases(self):
        child = subprocess.run(['node', 'tests/input_firstcheck_inventory_matrix_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-5000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['result'], 'pass')
        self.assertEqual((report['old_case_bodies'], report['current_cases'],
                          report['subsequent_original_ids_shifted'], report['required_current_input_ids']),
                         (117, 119, 91, 119))
        self.assertEqual([case.rsplit('#', 1)[-1] for case in report['inserted_regression_ids']], ['26', '27'])
        self.assertFalse(report['historical_execution_reattributed'])
        self.assertFalse(report['artifact_or_audit_admission_granted'])
