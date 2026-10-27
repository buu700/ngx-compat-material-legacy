# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Fresh upstream build contexts retain the complete original predicates."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PackedUpstreamBuildContextTests(unittest.TestCase):
    def test_complete_build_context_and_exact_inspector_successor(self):
        result = subprocess.run(['node', 'tests/packed_upstream_build_context_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(len(report['cases']), 3)
        self.assertEqual(len(report['rejected']), 10)
        self.assertEqual(report['current_build_entries'], 14)
        self.assertEqual(report['current_consolidation_entries'], 32)
        self.assertFalse(report['current_native_packed_or_floor_or_g11_credit'])
