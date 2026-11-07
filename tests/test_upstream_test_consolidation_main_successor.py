# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite main consolidation source successor remains fail closed."""
from pathlib import Path
import json
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ConsolidationMainSuccessorTests(unittest.TestCase):
    def test_finite_source_context(self):
        result = subprocess.run(['node', 'tests/upstream_test_consolidation_main_successor_probe.mjs'],
                                cwd=ROOT, check=True, capture_output=True, text=True)
        observed = json.loads(result.stdout)
        self.assertEqual(observed['positive_entries'], 32)
        self.assertEqual(observed['negative_controls'], 14)
