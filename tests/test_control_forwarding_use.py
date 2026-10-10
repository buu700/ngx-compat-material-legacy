# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Historical form-field host state keys and unnormalized absent-control values."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ControlForwardingUseTests(unittest.TestCase):
    def test_historical_host_state_forwarding(self):
        command = ['node', '--max-old-space-size=512', 'tests/control_forwarding_use_probe.mjs']
        if os.environ.get('CLOSEOUT_CONTROL_FORWARDING_REPORT'):
            command.extend(['--report', os.environ['CLOSEOUT_CONTROL_FORWARDING_REPORT']])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['frozen_uses'], 1)
        self.assertEqual(report['state_class_bindings'], 7)
        self.assertEqual(report['scenarios_per_method'], 11)
        self.assertEqual(report['property_reads_per_subject'], 154)
        self.assertEqual(report['mutations'], 10)
        self.assertFalse(report['native_executed'])
