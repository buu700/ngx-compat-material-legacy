# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Public NgZone context and whole owned observer lifetimes, with explicit protocols."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class NgZoneRemainingRuntimeTests(unittest.TestCase):
    def test_public_context_and_owned_observer_lifetimes(self):
        command = ['node', '--max-old-space-size=512', 'tests/ng_zone_remaining_runtime_probe.mjs']
        if os.environ.get('CLOSEOUT_NG_ZONE_REMAINING_REPORT'):
            command.append(os.environ['CLOSEOUT_NG_ZONE_REMAINING_REPORT'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['subjects'], 10)
        self.assertEqual(report['mutation_rejections'], 36)
        self.assertEqual(report['source_member_accesses'], 61)
        self.assertEqual(report['new_frozen_use_closures'], 0)
        self.assertFalse(report['native_or_packed_qualified'])
