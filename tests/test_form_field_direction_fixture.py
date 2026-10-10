# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Actual Angular scheduling and CDK Dir verify the native fixture's wiring."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FormFieldDirectionFixtureTests(unittest.TestCase):
    def test_real_angular_scheduled_initialization_and_destruction(self):
        command = ['node', '--max-old-space-size=512', 'tests/form_field_direction_fixture_probe.mjs']
        if os.environ.get('CLOSEOUT_FIELD_DIRECTION_FIXTURE_REPORT'):
            command.append(os.environ['CLOSEOUT_FIELD_DIRECTION_FIXTURE_REPORT'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['subjects'], 8)
        self.assertEqual(report['cases'], 24)
        self.assertFalse(report['native_executed'])
        self.assertFalse(report['actual_legacy_field_executed'])
