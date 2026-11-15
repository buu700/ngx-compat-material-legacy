# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Finite option source and registration metadata; no runtime qualification."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class OptionPlainInputInventoryMatrixTests(unittest.TestCase):
    def test_current_option_source_and_required_cases(self):
        child = subprocess.run(['node', 'tests/option_plain_input_inventory_matrix_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-5000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['result'], 'pass')
        self.assertEqual((report['old_case_bodies'], report['current_cases'],
                          report['required_roster']), (15, 17, 2341))
        self.assertEqual([case.rsplit('#', 1)[-1] for case in report['appended_regression_ids']], ['15', '16'])
        self.assertFalse(report['historical_execution_reattributed'])
        self.assertFalse(report['artifact_or_audit_admission_granted'])
