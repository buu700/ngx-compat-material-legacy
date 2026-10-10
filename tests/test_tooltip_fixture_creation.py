# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Public Angular captures the fixture directive during actual view creation."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TooltipFixtureCreationTests(unittest.TestCase):
    def test_actual_core_creation_and_self_injection_before_view_update(self):
        command = ['node', '--max-old-space-size=512', 'tests/tooltip_fixture_creation_probe.mjs']
        if os.environ.get('CLOSEOUT_TOOLTIP_FIXTURE_CREATION_REPORT'):
            command.append(os.environ['CLOSEOUT_TOOLTIP_FIXTURE_CREATION_REPORT'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['subjects'], 8)
        self.assertFalse(report['native_executed'])
        self.assertFalse(report['actual_legacy_tooltip_executed'])
