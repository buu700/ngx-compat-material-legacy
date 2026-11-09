# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
"""Epoch dispatch fails closed and preserves the 21.x route."""
import unittest
from pathlib import Path
from component_config_route import component_config_line, line_from_capture, probe_for

ROOT = Path(__file__).resolve().parents[1]


class ComponentConfigRoute(unittest.TestCase):
    def test_main_21_and_changed_capture(self):
        data = (ROOT / 'compatibility/rc/component-config-caller-prior.json.gz').read_bytes()
        self.assertEqual(line_from_capture(data), component_config_line())
        for family in ('contracts', 'types', 'public_runtime', 'owned_runtime'):
            self.assertIn('component_config_caller_', probe_for('21.x', family))
            self.assertNotIn('component_config_caller_', probe_for('main', family))
        with self.assertRaises(ValueError):
            probe_for('main', 'unknown')
        with self.assertRaises(ValueError):
            line_from_capture(data + b'\n')
