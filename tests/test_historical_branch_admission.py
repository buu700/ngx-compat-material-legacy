# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""The historical writer preserves complete discovery and exact source-line ownership."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class HistoricalBranchAdmissionTests(unittest.TestCase):
    def test_current_roster_and_writer_corruption_controls(self):
        result = subprocess.run(['node', 'tests/historical_branch_admission_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-7000:])
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['required_historical_cases'], 2225)
        self.assertEqual(observed['preceding_case_ids_retained'], 2157)
        self.assertEqual(observed['writer_controls'], 13)
        self.assertFalse(observed['actual_browser_artifact_or_floor_executed'])
