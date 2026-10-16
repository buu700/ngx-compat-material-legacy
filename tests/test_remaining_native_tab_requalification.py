# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Tab lifecycle requalification preserves prior judgments and rejects metadata drift."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TabRepairRequalificationTests(unittest.TestCase):
    def test_actual_pipeline_and_cached_before_proposed_controls(self):
        result = subprocess.run(['node', 'tests/remaining_native_tab_requalification_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['source_scope_rows'], 52)
        self.assertEqual(report['existing_roles'], 13)
        self.assertEqual(report['existing_runtime_requirements'], 17)
        self.assertEqual(report['metadata_corruption_controls'], 62)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])
