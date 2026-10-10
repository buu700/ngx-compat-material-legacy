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


class RippleEventManagerRuntimeTests(unittest.TestCase):
    def test_whole_manager_historical_dispatch_and_replay_fallback(self):
        command = ['node', '--max-old-space-size=512', 'tests/ripple_event_manager_runtime_probe.mjs']
        if os.environ.get('CLOSEOUT_RIPPLE_EVENT_REPORT'):
            command.append(os.environ['CLOSEOUT_RIPPLE_EVENT_REPORT'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['subjects'], 10)
        self.assertEqual(report['cases'], 100)
        self.assertEqual(report['mutation_rejections'], 76)
        self.assertFalse(report['native_or_packed_qualified'])
