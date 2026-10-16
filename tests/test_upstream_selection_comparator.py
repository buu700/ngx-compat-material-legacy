# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""A source label cannot substitute for the actual public model artifact case."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PublicSelectionAdmissionTests(unittest.TestCase):
    def test_exact_predecessor_and_individual_source_judgment_controls(self):
        result = subprocess.run(['node', 'scripts/run-historical-source-probe.mjs', 'selection-comparator-source'], cwd=ROOT,
                                capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['source_corruptions_rejected'], 23)
        self.assertEqual(report['metadata_corruptions_rejected'], 26)
        self.assertEqual(report['actual_source_inspector_corruptions_rejected'], 10)
        self.assertEqual(report['existing_runtime_contexts_requalified'], 16)
        self.assertEqual(report['existing_roles_requalified'], 167)
        self.assertFalse(report['actual_packed_native_or_floor_qualified'])

    def test_actual_reader_cli_and_rich_semantic_controls(self):
        result = subprocess.run(['node', 'tests/upstream/selection-comparator-admission.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-12000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['finite_subjects'], 1)
        self.assertEqual(report['full_packed_roster'], 106)
        self.assertGreaterEqual(report['actual_helper_controls'], 20)
        self.assertEqual(report['cached_actual_body_semantic_controls'], 248)
        self.assertEqual(report['actual_CLI_controls'], 8)
        self.assertFalse(report['actual_source_judgment_completed_by_this_test'])
        self.assertFalse(report['actual_packed_native_or_floor_qualified'])
