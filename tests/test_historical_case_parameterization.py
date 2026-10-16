# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Discovery follows actual finite Jasmine registration without executing test bodies."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class HistoricalCaseParameterizationTests(unittest.TestCase):
    def test_registration_oracle_and_unresolved_flow_rejection(self):
        result = subprocess.run(['node', 'tests/historical_case_parameterization_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-7000:])
