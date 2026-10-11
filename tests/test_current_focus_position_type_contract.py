# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Seven newly authored literal types preserve their original domains and erasure."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CurrentFocusPositionTypes(unittest.TestCase):
    def test_actual_current_roster_and_negative_controls(self):
        result = subprocess.run(['node', '--max-old-space-size=768',
                                 'tests/current_focus_position_type_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['current_additional_uses'], 7)
        self.assertEqual(report['source_files'], 3)
        self.assertEqual(report['erased_imports'], 5)
        self.assertEqual(report['historical_type_reexports'], 2)
        self.assertEqual(report['mutants_rejected'], 19)
        self.assertEqual(report['alias_binding_positive'], 1)
        self.assertFalse(report['native_or_packed_execution'])
        self.assertFalse(report['consumer_floor_execution'])
