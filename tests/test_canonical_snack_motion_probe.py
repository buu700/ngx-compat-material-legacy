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


class CanonicalSnackMotionProbeTests(unittest.TestCase):
    def test_complete_probe_rejects_incomplete_motion_and_stale_input(self):
        args = ['node', 'tests/canonical_snack_motion_probe_contract.mjs']
        if os.environ.get('CLOSEOUT_CANONICAL_SNACK_REPORT'):
            args.append(os.environ['CLOSEOUT_CANONICAL_SNACK_REPORT'])
        result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, timeout=20)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['cases'], 23)
        self.assertEqual(report['mutation_rejections'], 2)
        self.assertFalse(report['native_executed'])
