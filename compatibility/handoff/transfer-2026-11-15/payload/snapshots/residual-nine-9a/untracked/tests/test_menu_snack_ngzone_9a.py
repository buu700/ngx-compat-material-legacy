# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT.
"""Current admission and separately re-executed historical zone controls."""
import json
import subprocess
import unittest

class MenuSnackZone9a(unittest.TestCase):
    def run_probe(self, file):
        run = subprocess.run(['node', file], capture_output=True, text=True, timeout=180, check=True)
        return json.loads(run.stdout.strip().splitlines()[-1])
    def test_historical_producers_and_controls(self):
        r = self.run_probe('tests/menu_snack_zone_9a_historical_probe.mjs')
        self.assertEqual((r['focus_subjects'], r['focus_faults'], r['zone_subjects'], r['zone_faults']), (10, 40, 10, 46))
        self.assertEqual((r['source_controls'], r['original_faults']), (16, 94))
    def test_exact_current_source_admission(self):
        r = self.run_probe('tests/menu_snack_ngzone_9a_admission_probe.mjs')
        self.assertEqual((r['selected'], r['previously_reviewed'], r['previously_insufficient']), (2, 1, 1))
        self.assertTrue(r['structural_output_only'])
