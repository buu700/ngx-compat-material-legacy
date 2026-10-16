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


class RemainingNativeSourceContextTests(unittest.TestCase):
    def test_real_source_requalification_and_subject_corruptions(self):
        result = subprocess.run(['node', 'scripts/run-historical-source-probe.mjs', 'native-admission-source'], cwd=ROOT,
                                capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['source_scope_rows'], 52)
        self.assertEqual(report['existing_runtime_contexts'], 17)
        self.assertEqual(report['existing_authored_receipts'], 13)
        self.assertEqual(report['actual_inspector_corruptions_rejected'], 7)
        self.assertEqual(report['exact_tab_role_corruptions_rejected'], 13)
        self.assertGreaterEqual(report['historical_metadata_corruptions_rejected'], 40)
        self.assertEqual(report['rehashed_role_review_corruptions_rejected'], 5)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])
