# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Chip source requalification must preserve original judgments and actual runtime gates."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SpecStabilityContextTests(unittest.TestCase):
    def test_original_validators_and_current_source_metadata_rejections(self):
        result = subprocess.run(['node', 'scripts/run-historical-source-probe.mjs', 'stability-chip-context'], cwd=ROOT,
                                capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['controls'], 174)
        self.assertEqual(report['source_scope_rows'], 83)
        self.assertEqual(report['native_source_bindings'], 20)
        self.assertEqual(report['generic_source_records'], 13)
        self.assertEqual(report['frozen_import_receipts'], 27)
        self.assertEqual(report['qualified_entries'], 116)
        self.assertEqual(report['proposed_writes'], 44)
        self.assertEqual(report['frozen_reviewed'], 1446)
        self.assertEqual(report['frozen_insufficient'], 0)
        self.assertEqual(report['delta_reviewed'], 178)
        self.assertEqual(report['current_uses'], 1958)
        self.assertTrue(report['current_authored_source_snapshot_valid'])
        self.assertTrue(report['all1697_dispositions_and_all_authored_statuses_preserved'])
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])
