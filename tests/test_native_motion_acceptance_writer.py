# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Native report counts describe actual returned cases and retain raw evidence."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class NativeMotionAcceptanceWriterTests(unittest.TestCase):
    def test_actual_writer_and_false_execution_regressions(self):
        result = subprocess.run(['node', 'tests/native_motion_acceptance_writer_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['complete_actual_writer_scenarios'], 16)
        self.assertEqual(report['actual_writer_and_qualifier_mutants_rejected'], 6)
        self.assertEqual(report['unchanged_roster'], 306)
        self.assertTrue(report['complete_preceding_writer_recovered'])
        self.assertFalse(report['actual_packed_native_or_floor_qualified'])
