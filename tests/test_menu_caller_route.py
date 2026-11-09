# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
"""Menu route depends only on the authenticated capture."""
import unittest
from pathlib import Path
from menu_caller_route import line_from_capture, menu_line, probe_for
ROOT = Path(__file__).resolve().parents[1]
class MenuCallerRoute(unittest.TestCase):
    def test_routes_and_corruption(self):
        data = (ROOT / 'compatibility/rc/menu-caller-prior.json.gz').read_bytes()
        self.assertEqual(line_from_capture(data), menu_line())
        self.assertEqual(probe_for('main'), 'tests/menu_caller_current_adapter.mjs')
        self.assertEqual(probe_for('21.x'), 'tests/menu_caller_probe.mjs')
        with self.assertRaises(ValueError):
            line_from_capture(data + b'\n')
        with self.assertRaises(ValueError):
            probe_for('other')
