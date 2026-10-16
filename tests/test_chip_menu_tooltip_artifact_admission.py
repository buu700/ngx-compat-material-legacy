# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite current source decisions require genuine same-run structured behavior."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ChipMenuTooltipArtifactAdmissionTests(unittest.TestCase):
    def test_source_helper_cli_and_corruption_controls(self):
        result = subprocess.run(
            ['node', 'tests/upstream/chip-menu-tooltip-artifact-admission.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-7000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['individual_new_source_decisions'], 3)
        self.assertEqual(report['preceding_source_contexts_requalified'], 3)
        self.assertEqual(report['complete_new_original_hunks'], 11)
        self.assertEqual(report['unchanged_other_ledger_rows'], 1691)
        self.assertEqual(report['helper_cases'], 441)
        self.assertEqual(report['semantic_corruption_controls'], 345)
        self.assertEqual(report['actual_cli_cases'], 21)
        self.assertEqual(report['source_corruption_controls'], 9)
        self.assertFalse(report['actual_product_or_packed_or_native_or_floor_qualified'])
        self.assertEqual(report['actual_runtime_or_authored_use_closures'], 0)
        self.assertEqual(report['g11_claim'], 'not-passed')
