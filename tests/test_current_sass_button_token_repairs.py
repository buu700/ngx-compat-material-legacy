# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Strict pure report successor; no original/current Sass or source producer."""
import json
import os
from pathlib import Path
import subprocess
import unittest
from test_current_sass_source import NODE

ROOT = Path(__file__).resolve().parents[1]


class CurrentButtonTokenRepairsTests(unittest.TestCase):
    def test_exact_report_reconstruction_and_original_proofs(self):
        child = subprocess.run([NODE, 'tests/current_sass_button_token_repairs_probe.mjs'],
                               cwd=ROOT, text=True, capture_output=True, timeout=30)
        self.assertEqual(child.returncode, 0, child.stderr)
        report = json.loads(child.stdout)
        self.assertEqual(report['checks_passed'], 143)
        self.assertEqual(report['finite_cases'], 14)
        self.assertEqual(report['retained_actual_wholeCSS_checks'], 2)
        self.assertEqual(report['getter_calls'], 0)
        self.assertEqual(report['fresh_compiler_calls'], 0)
        self.assertFalse(report['actual_source_producer_executed'])
        self.assertFalse(report['actual_current_tool_subject_executed'])
        if os.environ.get('CURRENT_SASS_BUTTON_TOKEN_REPAIRS_REPORT'):
            with Path(os.environ['CURRENT_SASS_BUTTON_TOKEN_REPAIRS_REPORT']).open('x') as out:
                out.write(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    unittest.main()
