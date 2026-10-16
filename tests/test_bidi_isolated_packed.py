# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""An isolated legacy bidi scope must reach the existing packed admission cell."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class IsolatedBidiPackedTests(unittest.TestCase):
    def test_scope_collector_and_lifecycle_controls(self):
        result = subprocess.run(['node', 'tests/bidi_isolated_packed_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=25)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertGreaterEqual(observed['semantic_and_actual_collector_defects_rejected'], 80)
        self.assertEqual(observed['collector_mutants_detected'], 3)
        self.assertEqual(observed['actual_writer_cases'], 4)
        self.assertEqual(observed['source_scope_mutants_detected'], 10)
        self.assertFalse(observed['actual_packed_native_or_floor_execution'])
