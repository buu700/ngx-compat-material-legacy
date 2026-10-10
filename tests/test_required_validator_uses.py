# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Genuine public required callback, empty subclasses and actual historical providers."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]


class RequiredValidatorUseTests(unittest.TestCase):
    def test_required_getters_cache_and_multi_providers(self):
        command = ['node', '--max-old-space-size=512', 'tests/required_validator_use_probe.mjs']
        if os.environ.get('CLOSEOUT_REQUIRED_VALIDATOR_REPORT'):
            command.extend(['--report', os.environ['CLOSEOUT_REQUIRED_VALIDATOR_REPORT']])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['frozen_uses'], 6)
        self.assertEqual(report['supplemental_current_uses'], 1)
        self.assertEqual(report['getter_observations_per_subject'], 52)
        self.assertEqual(report['checkbox_observations_per_subject'], 60)
        self.assertEqual(report['validator_cache_steps_per_subject'], 7)
        self.assertEqual(report['mutations'], 16)
        self.assertFalse(report['native_executed'])
