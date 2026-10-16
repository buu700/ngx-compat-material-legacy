# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Native completion requires the full bound run and the physical event trace."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TabCompletionAdmissionTests(unittest.TestCase):
    def test_actual_writer_reader_and_raw_native_controls(self):
        result = subprocess.run(['node', 'tests/upstream/tab-completion-admission.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-10000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['full_native_roster'], 306)
        self.assertEqual(report['required_tab_cases'], 54)
        self.assertGreaterEqual(report['actual_reader_writer_controls'], 60)
        self.assertEqual(report['cached_actual_full_native_raw_controls'], 306)
        self.assertGreaterEqual(report['cached_actual_tab_semantic_controls'], 700)
        self.assertFalse(report['actual_packed_native_or_floor_qualified'])
