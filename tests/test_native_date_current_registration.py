# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current NativeDate source registration controls; no product run is qualified."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class NativeDateCurrentRegistration(unittest.TestCase):
    def test_current_source_and_missing_run_guards(self):
        result = subprocess.run(['node', 'tests/native_date_current_registration_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['source_members'], 18)
        self.assertEqual(report['stale_source_controls'], 18)
        self.assertEqual(report['repinned_original_mutations_rejected'], 2)
        self.assertEqual(report['scope_mutants_rejected'], 4)
        self.assertTrue(report['missing_run_rejected'])
        self.assertTrue(report['previous_entry_recovered'])
        self.assertTrue(report['synthetic_only'])
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])
