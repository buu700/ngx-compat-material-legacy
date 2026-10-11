"""Finite menu type/literal requalification and production admission reject drift."""
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# MIT-style license: see LICENSE.
import json
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]


class HistoricalMenuTypeRequalificationTests(unittest.TestCase):
    def test_live_source_and_owned_type_roles(self):
        result = subprocess.run(['node', 'tests/historical_menu_type_requalification_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-3000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['requalified_frozen_rows'], 29)
        self.assertEqual(report['new_current_type_rows'], 3)
        self.assertEqual(report['producer_mutations'], 100)
        self.assertEqual(report['negative_controls'], 7)
        self.assertFalse(report['native_or_packed_qualified'])

    def test_actual_authored_admission_rejects_changed_and_wrong_line_evidence(self):
        result = subprocess.run(['node', 'tests/historical_menu_type_admission_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-3000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['valid_rows'], 32)
        self.assertEqual(report['negative_groups'], 7)
        self.assertEqual(report['caller_files_checked'], 4)
        self.assertFalse(report['native_or_packed_qualified'])
