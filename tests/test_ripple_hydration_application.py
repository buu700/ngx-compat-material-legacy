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


class RippleHydrationApplicationTests(unittest.TestCase):
    def test_public_pinned_application_and_replay_failure_controls(self):
        result = subprocess.run(['node', 'tests/ripple_hydration_application_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['specifications'], 4)
        self.assertEqual(report['negative_mutations'], 30)
        self.assertFalse(report['native_or_packed_AOT_executed'])
