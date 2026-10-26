# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exactly25 reviewed source closures preserve every other original obligation."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MaterialRemainingCallerIntegration(unittest.TestCase):
    def test_complete_source_batch_preserves_other_rows(self):
        result = subprocess.run(
            ['node', 'tests/material_remaining_caller_integration_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=600,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['integrated_decisions'], 25)
        self.assertEqual(report['frozen_valid'], 1730)
        self.assertEqual(report['additional_valid'], 315)
        self.assertEqual(report['open'], 6)
        self.assertTrue(report['all_unselected_authored_rows_identical'])
        self.assertTrue(report['all1697_upstream_rows_identical'])
        self.assertEqual(report['input_corruptions_rejected'], 8)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertFalse(report['actual_native_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
