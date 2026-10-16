# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Detailed existing packed cases fail closed; runtime execution remains separate."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ChipMenuTooltipPackedContractTests(unittest.TestCase):
    def test_actual_collector_writer_and_source_controls(self):
        result = subprocess.run(
            ['node', 'tests/chip_menu_tooltip_packed_contract_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['retained_case_ids'], 106)
        self.assertEqual(report['controls'], 378)
        self.assertEqual(report['collector_mutants'], 12)
        self.assertEqual(report['writer_controls'], 9)
        self.assertEqual(report['source_controls'], 21)

    def test_unchanged_product_roles_and_tooling_evidence(self):
        result = subprocess.run(
            ['node', 'tests/chip_menu_tooltip_packed_evidence_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['roles'], 167)
        self.assertEqual(report['negative_controls'], 10)
        self.assertEqual(report['new_closures'], 0)
