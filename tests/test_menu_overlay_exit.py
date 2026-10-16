# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""The owned trigger retains exit views and rejects stale removal work."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MenuOverlayExitTests(unittest.TestCase):
    def test_whole_constructor_lifetimes_and_specific_corruptions(self):
        command = ['node', 'tests/menu_overlay_exit_probe.mjs']
        if os.environ.get('MENU_OVERLAY_EXIT_DIAGNOSTIC'):
            command.extend(['--report', os.environ['MENU_OVERLAY_EXIT_DIAGNOSTIC']])
        result = subprocess.run(command, cwd=ROOT,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['cases'], 18)
        self.assertEqual(observed['mutants_rejected'], 14)
        self.assertEqual(observed['failures'], [])
        self.assertFalse(observed['native_or_packed_or_floor_qualified'])

    def test_real_exit_observation_required_by_existing_native_cases(self):
        result = subprocess.run(['node', 'tests/menu_overlay_exit_native_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['menu_mode_cases'], 18)
        self.assertGreaterEqual(observed['validator_controls'], 180)
        self.assertFalse(observed['actual_native_or_artifact_or_floor_executed'])
