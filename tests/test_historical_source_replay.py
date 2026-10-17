# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Historical replay cannot silently replace altered current source subjects."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class HistoricalSourceReplayTests(unittest.TestCase):
    def test_current_graph_and_exact_reference_corruption_controls(self):
        result = subprocess.run(['node', 'tests/historical_source_replay_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['controls'], 91)
        self.assertEqual(report['current_product_members'], 1141)
        self.assertEqual(report['historical_probes_executed'], 0)
        self.assertFalse(report['actual_current_native_or_packed_qualified'])
