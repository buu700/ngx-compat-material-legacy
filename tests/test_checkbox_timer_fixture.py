# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CheckboxTimerFixtureTests(unittest.TestCase):
    def test_actual_public_view_wiring_and_negative_protocols(self):
        command = ['node', '--max-old-space-size=512', 'tests/checkbox_timer_fixture_probe.mjs']
        if os.environ.get('CLOSEOUT_CHECKBOX_FIXTURE_REPORT'):
            command.append(os.environ['CLOSEOUT_CHECKBOX_FIXTURE_REPORT'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['subjects'], 8)
        self.assertEqual(report['cases'], 32)
        self.assertEqual(report['negative_variants'], 24)
        self.assertFalse(report['actual_legacy_checkbox_executed'])
        self.assertFalse(report['native_executed'])
