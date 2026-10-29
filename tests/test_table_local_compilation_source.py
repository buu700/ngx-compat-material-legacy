# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Whole original source review and finite current compiler/metadata controls."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TableLocalCompilationSourceTest(unittest.TestCase):
    def test_complete_original_current_source_and_semantic_controls(self):
        execution = subprocess.run(
            ['node', 'tests/table_local_compilation_source_probe.mjs'],
            cwd=ROOT, text=True, capture_output=True, check=False,
        )
        self.assertEqual(execution.returncode, 0, execution.stdout + execution.stderr)
        report = json.loads(execution.stdout)
        self.assertEqual(report['result'], 'pass')
        self.assertEqual(report['complete_original_hunks'], 7)
        self.assertEqual(report['small_compiler_cells_qualified'], 6)
        for name, count in [
            ('original_data_faults_rejected', 9),
            ('compiler_receipt_faults_rejected', 10),
            ('owned_metadata_faults_rejected', 6),
            ('cold_source_faults_rejected', 14),
            ('late_source_faults_rejected', 4),
        ]:
            self.assertEqual(report[name], count, name)
        self.assertEqual(report['canonical_decisions_changed'], 0)
        self.assertEqual(report['product_changes'], 0)
        self.assertFalse(report['actual_native_packed_browser_floor_or_full_audit_qualified'])
        self.assertEqual(report['g11_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
