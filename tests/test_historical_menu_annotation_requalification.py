"""Finite public metadata roles, changed menu tokens and actual admission reject drift."""
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# MIT-style license: see LICENSE.
import json
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]


class HistoricalMenuAnnotationRequalificationTests(unittest.TestCase):
    def test_live_roles_changed_tokens_and_authentic_metadata_receipts(self):
        result = subprocess.run(['node', 'tests/historical_menu_annotation_requalification_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-3000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['reviewed_source_rows'], 216)
        self.assertEqual(report['annotations_per_subject'], [322, 209])
        self.assertEqual(report['producer_mutations'], 46)
        self.assertEqual(report['negative_controls'], 6)
        self.assertFalse(report['native_or_packed_qualified'])

    def test_actual_authored_admission_rejects_changed_and_wrong_line_evidence(self):
        result = subprocess.run(['node', 'tests/historical_menu_annotation_admission_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-3000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['valid_rows'], 216)
        self.assertEqual(report['negative_groups'], 7)
        self.assertEqual(report['caller_files_checked'], 67)
        self.assertFalse(report['native_or_packed_qualified'])
