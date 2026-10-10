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


class RippleHydrationObserverTests(unittest.TestCase):
    def test_capture_precedes_bootstrap_and_failed_input_cleans_up(self):
        result = subprocess.run(['node', 'tests/ripple_hydration_observer_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['protocol_cases'], 2)
        self.assertTrue(report['failure_cleanup'])
        self.assertFalse(report['native_or_angular_replay_executed'])
