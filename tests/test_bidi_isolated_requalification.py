# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact preceding sources and role decisions survive the stricter bidi case."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class IsolatedBidiRequalificationTests(unittest.TestCase):
    def test_sources_receipts_and_foreign_changes(self):
        result = subprocess.run(['node', 'tests/bidi_isolated_requalification_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['preceding_complete_sources'], 22)
        self.assertGreaterEqual(observed['controls'], 80)
        self.assertEqual(observed['new_closures'], 0)
