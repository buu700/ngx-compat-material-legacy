# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
"""Capture routing is explicit and rejects unknown data."""
import gzip
from pathlib import Path
import unittest
from form_field_caller_route import line_from_capture, probe_for

ROOT = Path(__file__).resolve().parents[1]


class FormFieldCallerRoute(unittest.TestCase):
    def test_capture_and_routes(self):
        raw = (ROOT / 'compatibility/rc/form-field-caller-prior.json.gz').read_bytes()
        line = line_from_capture(raw)
        self.assertIn(line, ('main', '21.x'))
        self.assertEqual(probe_for('main', 'contracts'), 'tests/form_field_caller_current_main.mjs')
        self.assertEqual(probe_for('main', 'integration'), 'compatibility/rc/form-field-caller-integration-check.mjs')
        self.assertEqual(probe_for('21.x', 'contracts'), 'tests/form_field_caller_probe.mjs')
        self.assertEqual(probe_for('21.x', 'integration'), 'compatibility/rc/form-field-caller-integration-check.mjs')
        with self.assertRaises(ValueError):
            line_from_capture(gzip.compress(b'{"line":"main"}'))
        with self.assertRaises(ValueError):
            probe_for('main', 'unknown')
        with self.assertRaises(ValueError):
            probe_for('other', 'contracts')


if __name__ == '__main__':
    unittest.main()
