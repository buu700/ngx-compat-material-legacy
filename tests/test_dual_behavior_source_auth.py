# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Authentic source routes support individual judgments, not runtime claims."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DualBehaviorSourceAuthTests(unittest.TestCase):
    def test_complete_patch_and_floor_source_identity(self):
        result = subprocess.run(['node', 'tests/dual_behavior_source_auth_probe.mjs'], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        for field, expected in [('original_patches', 2), ('total_original_hunks', 12), ('scroll_source_contexts', 3),
                ('scroll_classes', 12), ('table_floor_methods', 6), ('owned_callers', 9)]:
            self.assertEqual(observed[field], expected, field)
        self.assertFalse(observed['actual_packed_executed'])
