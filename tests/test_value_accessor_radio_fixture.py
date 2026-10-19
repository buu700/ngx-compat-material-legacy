# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Actual generated callbacks against owned radio harnesses and public peer contracts."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ValueAccessorRadioFixture(unittest.TestCase):
    def test_supported_public_filters_and_actual_harness_handlers(self):
        command = ['node', 'tests/value_accessor_radio_fixture_probe.mjs']
        if os.environ.get('NGX_CVA_RADIO_FIXTURE_DIAGNOSTIC'):
            command.append(os.environ['NGX_CVA_RADIO_FIXTURE_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=150)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-10000:])
        result = json.loads(child.stdout)
        self.assertEqual(result['subjects'], 3)
        self.assertEqual(result['protocol_cases'], 6)
        self.assertEqual(result['protocol_faults_rejected'], 24)
        self.assertEqual(result['source_controls_rejected'], 3)
        self.assertEqual(result['strict_negative_type_checks'], 12)
        self.assertEqual(result['original_bug_diagnostics'], 6)
        self.assertFalse(result['actual_packed_control_instances_executed'])
        self.assertFalse(result['native_browser_executed'])
