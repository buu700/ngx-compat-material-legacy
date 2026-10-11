"""Remaining menu type/helper roles and actual source admission reject drift."""
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# MIT-style license: see LICENSE.
import json
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]


class HistoricalMenuRemainingImportRequalificationTests(unittest.TestCase):
    def test_live_roles_and_unchanged_tagged_panel(self):
        result = subprocess.run(['node', 'tests/historical_menu_remaining_import_requalification_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-3000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['reviewed_source_rows'], 12)
        self.assertEqual(report['producer_controls'], 135)
        self.assertEqual(report['negative_controls'], 6)
        self.assertTrue(report['panel_declaration_matches_untouched_tag'])
        self.assertFalse(report['native_or_packed_qualified'])

    def test_actual_admission_rejects_changed_and_wrong_line_evidence(self):
        result = subprocess.run(['node', 'tests/historical_menu_remaining_import_admission_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-3000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['valid_rows'], 12)
        self.assertEqual(report['negative_groups'], 7)
        self.assertEqual(report['caller_files_checked'], 2)
        self.assertFalse(report['native_or_packed_qualified'])
