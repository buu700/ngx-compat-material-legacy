# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current dialog source guard with one frozen type-metadata replay input."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PackedDialogTypeMetadataTests(unittest.TestCase):
    def test_type_metadata_does_not_project_product_or_weaken_raw_guards(self):
        result = subprocess.run(
            ['node', 'tests/packed_dialog_type_metadata_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['result'], 'pass')
        self.assertEqual(len(report['cases']), 5)
        self.assertEqual(len(report['rejected']), 12)
        self.assertEqual(report['current_applied_dialog_sources'], 49)
        self.assertEqual(report['historical_metadata_paths'],
                         ['compatibility/rc/api/export-name-allowlist.json'])
        self.assertFalse(report['current_native_or_floor_or_g11_credit'])
