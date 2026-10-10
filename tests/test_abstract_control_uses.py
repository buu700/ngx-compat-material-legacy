# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Historical erased casts and cached select control references at exact peer minima."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AbstractControlUseTests(unittest.TestCase):
    def test_cast_identity_and_select_control_replacement(self):
        command = ['node', '--max-old-space-size=512', 'tests/abstract_control_use_probe.mjs']
        if os.environ.get('CLOSEOUT_ABSTRACT_CONTROL_REPORT'):
            command.extend(['--report', os.environ['CLOSEOUT_ABSTRACT_CONTROL_REPORT']])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['frozen_uses'], 23)
        self.assertEqual(report['casts'], 22)
        self.assertEqual(report['previous_control_fields'], 1)
        self.assertEqual(report['controls_per_subject'], 4)
        self.assertEqual(report['observations_per_subject'], 12)
        self.assertEqual(report['mixin_identity_calls_per_subject'], 115)
        self.assertEqual(report['select_steps_per_subject'], 12)
        self.assertEqual(report['mutations'], 10)
        self.assertFalse(report['native_executed'])
