# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Same-run prerequisites and exact historical hover observations are mandatory."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FormFieldHoverAdmissionTests(unittest.TestCase):
    def test_actual_browser_writer_reader_and_rich_semantic_controls(self):
        result = subprocess.run(['node', 'tests/upstream/form-field-hover-admission.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-10000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['full_packed_roster'], 106)
        self.assertEqual(report['full_browser_roster'], 912)
        self.assertGreaterEqual(report['actual_reader_and_writer_controls'], 90)
        self.assertGreaterEqual(report['cached_actual_guard_semantic_controls'], 300)
        self.assertFalse(report['actual_source_judgment_completed_by_this_test'])
        self.assertFalse(report['actual_packed_native_or_floor_qualified'])
