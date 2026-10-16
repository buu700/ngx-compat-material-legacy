# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""The new leading-zero regression exercises the complete owned data source."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SpecControlSortTests(unittest.TestCase):
    def test_actual_class_original_values_and_rejected_sort_mutant(self):
        result = subprocess.run(['node', 'tests/spec_control_sort_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['actual'], report['input'])
        self.assertEqual(report['input'][0], '001')
        self.assertTrue(report['whole_owned_class_and_facade_executed'])
        self.assertTrue(report['genuine_public_CDK_DataSource_parent'])
        self.assertTrue(report['mutant']['rejected'])
        self.assertTrue(report['temporary_directory_removed'])
        self.assertFalse(report['runtime']['canonical_or_floor_qualified'])
        self.assertFalse(report['actual_Angular_view_native_packed_or_floor_qualified'])
