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


class RippleRendererLifetimeTests(unittest.TestCase):
    def test_held_persistent_exit_and_cancelled_timer_ownership(self):
        args = ['node', 'tests/ripple_renderer_lifetime_probe.mjs']
        if os.environ.get('CLOSEOUT_RIPPLE_LIFETIME_REPORT'):
            args.append(os.environ['CLOSEOUT_RIPPLE_LIFETIME_REPORT'])
        result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['cases'], 10)
        self.assertEqual(report['mutations_rejected'], 5)
        self.assertFalse(report['native_or_framework_executed'])
