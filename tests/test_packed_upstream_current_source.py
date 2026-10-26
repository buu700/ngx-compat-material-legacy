# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current source integration preserves old evidence without projecting product."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PackedUpstreamCurrentSourceTests(unittest.TestCase):
    def test_current_product_and_inspector_successor_guards(self):
        result = subprocess.run(
            ['node', 'tests/packed_upstream_current_source_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['result'], 'pass')
        self.assertEqual(len(report['cases']), 6)
        self.assertEqual(len(report['rejected']), 26)
        self.assertEqual(report['current_overlay_sources'], 145)
        self.assertEqual(report['applied_dialog_sources'], 49)
        self.assertEqual(report['qualified_product_repairs'], 4)
        self.assertFalse(report['current_native_or_floor_or_g11_credit'])
