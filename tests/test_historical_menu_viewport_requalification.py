"""An exact menu-only producer edit preserves unchanged viewport source proof."""
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# MIT-style license: see LICENSE.
import json
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]


class HistoricalMenuViewportRequalificationTests(unittest.TestCase):
    def test_current_source_and_exact_producer_delta(self):
        result = subprocess.run(['node', 'tests/historical_menu_viewport_requalification_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-3000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['uses'], 8)
        self.assertEqual(report['unchanged_calls'], 6)
        self.assertEqual(report['negative_controls'], 5)
        self.assertFalse(report['previous_runtime_rerun'])
        self.assertFalse(report['native_or_packed_qualified'])
