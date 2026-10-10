# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Whole ink-bar class with genuine zones; native packed layout remains a separate gate."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class InkBarZoneRuntimeTests(unittest.TestCase):
    def test_historical_zoneful_timing_and_zoneless_positioning(self):
        command = ['node', '--max-old-space-size=512', 'tests/ink_bar_zone_runtime_probe.mjs']
        if os.environ.get('CLOSEOUT_INK_BAR_ZONE_REPORT'):
            command.append(os.environ['CLOSEOUT_INK_BAR_ZONE_REPORT'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['runtime_subjects'], 10)
        self.assertEqual(report['states_per_subject'], 5)
        self.assertEqual(report['source_mutations'], 4)
        self.assertEqual(report['runtime_mutations'], 10)
        self.assertTrue(report['zoneful_original_equivalence'])
        self.assertTrue(report['real_zoneless_provider_without_zone'])
        self.assertFalse(report['native_executed'])
