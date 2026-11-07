# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite test-import successor lineage cannot be bypassed."""
from pathlib import Path
import json
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TestImportRosterSuccessorTests(unittest.TestCase):
    def test_finite_successor(self):
        result = subprocess.run(['node', 'tests/upstream_test_import_roster_successor_probe.mjs'],
                                cwd=ROOT, check=True, capture_output=True, text=True)
        outcome = json.loads(result.stdout)
        self.assertEqual(outcome['positive_entries'], 31)
        self.assertEqual(outcome['negative_controls'], 10)
        self.assertTrue(outcome['historical_predecessor_passed'])
