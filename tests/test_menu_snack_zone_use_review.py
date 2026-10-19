# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact current public-zone bindings and supplementary outside-caller observations."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]


class MenuSnackZoneUseReview(unittest.TestCase):
    def test_bindings_real_constructors_outside_callers_and_Node_task_capture(self):
        command = ['node', '--max-old-space-size=640', 'tests/menu_snack_zone_use_probe.mjs']
        if os.environ.get('NGX_MENU_SNACK_ZONE_USE_DIAGNOSTIC'):
            command.append(os.environ['NGX_MENU_SNACK_ZONE_USE_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=150)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-12000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['source_imports'], 2)
        self.assertEqual(report['genuine_zone_subjects'], 10)
        self.assertEqual(report['supplement_cases'], 70)
        self.assertEqual(report['supplement_behavioral_faults'], 46)
        self.assertEqual(report['source_declaration_evidence_controls'], 16)
        self.assertEqual(report['fresh_original_subjects'], 20)
        self.assertEqual(report['fresh_original_behavioral_faults'], 94)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
