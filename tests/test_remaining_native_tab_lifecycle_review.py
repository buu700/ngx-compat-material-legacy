# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""The finite tab lifecycle source review rejects altered contracts and evidence."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TabLifecycleSourceReviewTests(unittest.TestCase):
    def test_actual_source_reviewer_and_corruption_controls(self):
        result = subprocess.run(['node', 'tests/remaining_native_tab_lifecycle_review_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-6000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['actual_reviewer_controls'], 36)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])
