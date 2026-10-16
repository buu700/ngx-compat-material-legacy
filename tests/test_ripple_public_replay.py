# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PublicRippleReplayTests(unittest.TestCase):
    def test_actual_observer_programs_and_no_launch_handler(self):
        result = subprocess.run(['node', 'tests/ripple_public_replay_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertTrue(report['exact_browser_programs'])
        self.assertTrue(report['whole_diagnostic_handler'])
        self.assertEqual(report['negative_controls'], 31)
        self.assertFalse(report['actual_native_or_Angular_replay'])
        self.assertFalse(report['source_disposition_closed'])
