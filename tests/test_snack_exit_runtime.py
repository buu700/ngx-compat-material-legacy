# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Whole snack-bar exit replay with genuine public render/zone hooks and explicit protocols."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SnackExitRuntimeTests(unittest.TestCase):
    def test_motion_completion_dismissal_and_destruction(self):
        command = ['node', '--max-old-space-size=512', 'tests/snack_exit_runtime_probe.mjs']
        if os.environ.get('CLOSEOUT_SNACK_EXIT_REPORT'):
            command.append(os.environ['CLOSEOUT_SNACK_EXIT_REPORT'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['subjects'], 10)
        self.assertEqual(report['mutation_rejections'], 54)
        self.assertFalse(report['native_executed'])
        self.assertFalse(report['actual_legacy_instances_qualified'])
