# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Strict pure14case button successor controls; no source producer or Sass execution."""
import json
from pathlib import Path
import subprocess
import unittest
from test_current_sass_source import NODE

ROOT = Path(__file__).resolve().parents[1]


class CurrentButtonTokenizationTests(unittest.TestCase):
    def test_pure_finite_model_and_retained_raw_css(self):
        child = subprocess.run([NODE, 'tests/current_sass_button_tokenization_probe.mjs'], cwd=ROOT,
                               text=True, capture_output=True, timeout=15)
        self.assertEqual(child.returncode, 0, child.stderr)
        result = json.loads(child.stdout)
        self.assertGreaterEqual(result['checks_passed'], 75)
        self.assertEqual(result['finite_cases'], 14)
        self.assertEqual(result['retained_actual_wholeCSS_checks'], 2)
        self.assertEqual(result['getter_calls'], 0)
        self.assertEqual(result['fresh_compiler_calls'], 0)
        self.assertFalse(result['actual_source_producer_executed'])


if __name__ == '__main__':
    unittest.main()
