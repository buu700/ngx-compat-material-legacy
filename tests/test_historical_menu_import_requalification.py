"""Finite menu import requalification and actual authored-use admission reject drift."""
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# MIT-style license: see LICENSE.
import json
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]


class HistoricalMenuImportRequalificationTests(unittest.TestCase):
    def test_live_roles_authenticated_execution_and_source_controls(self):
        result = subprocess.run(['node', 'scripts/run-historical-source-probe.mjs', 'historical-menu-import'],
                                cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-6000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['existing_element_roles'], 71)
        self.assertEqual(report['existing_detector_roles'], 41)
        self.assertEqual(report['current_context_roles'], 9)
        self.assertEqual(report['original_detector_calls'], 94)
        self.assertEqual(report['added_historical_detector_calls'], 2)
        self.assertEqual(report['negative_controls'], 8)
        self.assertFalse(report['native_or_packed_qualified'])

    def test_actual_review_admission_rejects_missing_changed_wrong_line_and_caller_evidence(self):
        result = subprocess.run(['node', 'scripts/run-historical-source-probe.mjs', 'historical-menu-import-admission'],
                                cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-6000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['valid_rows'], 123)
        self.assertEqual(report['negative_groups'], 7)
        self.assertEqual(report['caller_files_checked'], 81)
        self.assertFalse(report['native_or_packed_qualified'])
