# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
"""Tabs route depends only on the authenticated capture."""
import unittest
from pathlib import Path
from tabs_caller_route import line_from_capture, tabs_line, probe_for
ROOT = Path(__file__).resolve().parents[1]
class TabsCallerRoute(unittest.TestCase):
    def test_routes_and_corruption(self):
        data = (ROOT / 'compatibility/rc/tabs-caller-prior.json.gz').read_bytes()
        self.assertEqual(line_from_capture(data), tabs_line())
        self.assertEqual(probe_for('main'), 'tests/tabs_caller_current_adapter.mjs')
        self.assertEqual(probe_for('21.x'), 'tests/tabs_caller_probe.mjs')
        with self.assertRaises(ValueError):
            line_from_capture(data + b'\n')
        with self.assertRaises(ValueError):
            probe_for('other')
