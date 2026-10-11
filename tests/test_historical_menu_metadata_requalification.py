"""Finite class/token/annotation/key-manager review and actual admission reject drift."""
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# MIT-style license: see LICENSE.
import json
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]


class HistoricalMenuMetadataRequalificationTests(unittest.TestCase):
    def test_live_source_roles_and_authentic_metadata_evidence(self):
        run = subprocess.run(['node', '--experimental-vm-modules', 'tests/historical_menu_metadata_requalification_probe.mjs'],
                             cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(run.returncode, 0, (run.stderr or run.stdout)[-6000:])
        report = json.loads(run.stdout)
        self.assertEqual([g['cases'] for g in report['groups']], [148, 24, 9, 6])
        self.assertEqual([g['unchanged_role_shapes'] for g in report['groups']], [146, 24, 9, 6])
        self.assertEqual(report['negative_controls'], 6)
        self.assertFalse(report['native_or_packed_qualified'])

    def test_actual_authored_admission_rejects_stale_wrong_line_and_changed_members(self):
        run = subprocess.run(['node', 'tests/historical_menu_metadata_admission_probe.mjs'],
                             cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(run.returncode, 0, (run.stderr or run.stdout)[-6000:])
        report = json.loads(run.stdout)
        self.assertEqual(report['valid_rows'], 187)
        self.assertEqual(report['negative_groups'], 7)
        self.assertFalse(report['native_or_packed_qualified'])
