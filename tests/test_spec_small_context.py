# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Qualified fixture data does not waive earlier source scopes or native execution."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SmallSpecContextTests(unittest.TestCase):
    def test_actual_source_readers_and_context_corruption_controls(self):
        result = subprocess.run(['node', 'scripts/run-historical-source-probe.mjs', 'spec-fixture-context'], cwd=ROOT,
                                capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['source_scope_rows'], 83)
        self.assertEqual(report['native_source_bindings'], 20)
        self.assertEqual(report['proposed_writes'], 28)
        self.assertEqual(report['metadata_corruption_controls'], 75)
        self.assertEqual(report['inventory_delta_controls'], 8)
        self.assertEqual(report['actual_scope_semantic_controls'], 6)
        self.assertEqual(report['actual_inspector_controls'], 4)
        self.assertEqual(report['controls'], 93)
        self.assertTrue(report['all1697_dispositions_and_all_authored_statuses_preserved'])
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])
