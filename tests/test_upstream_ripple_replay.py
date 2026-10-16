# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RippleReplayAdmissionTests(unittest.TestCase):
    def test_actual_browser_writer_reader_and_raw_replay_controls(self):
        result = subprocess.run(['node', 'tests/upstream/ripple-replay-admission.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['actual_reader_writer_controls'], 19)
        self.assertGreaterEqual(report['cached_actual_body_raw_controls'], 403)
        self.assertEqual(report['full_packed_prerequisite'], 106)
        self.assertEqual(report['full_browser_prerequisite'], 912)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])
