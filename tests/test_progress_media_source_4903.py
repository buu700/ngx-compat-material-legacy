# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite source transition controls; no actual native or packed qualification."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ProgressMediaSource4903Tests(unittest.TestCase):
    def test_composable_source_transition(self):
        result = subprocess.run(['node', 'tests/upstream/progress-media-source-4903.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-10000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['selected_rows'], 3)
        self.assertEqual(report['authenticated_complete_deltas'], 13)
        self.assertEqual(report['source_corruption_controls'], 18)
        self.assertEqual(report['selected_mutations_rejected'], 4)
        self.assertTrue(report['unrelated_live_edit_byte_preserved'])
        self.assertTrue(report['no_coordinator_rejected'])
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])
        self.assertEqual(report['g11_claim'], 'not-passed')
