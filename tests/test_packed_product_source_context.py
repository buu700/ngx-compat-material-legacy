# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact packed repairs preserve raw admission and immutable old source epochs."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PackedProductSourceContext(unittest.TestCase):
    def test_exact_repairs_and_current_reader_rejection_controls(self):
        child = subprocess.run(
            ['node', 'tests/packed_product_source_context_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=180,
        )
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-12000:])
        report = json.loads(child.stdout)
        self.assertTrue(report['passed'])
        self.assertIn(report['line'], ['main', '21.x'])
        self.assertEqual(report['product_changes'], 4)
        self.assertEqual(report['tooling_changes'], 12)
        self.assertGreaterEqual(report['negative_controls'], 75)
        self.assertEqual(len(report['verifier_mutants_rejected']), 2)
        self.assertEqual(report['immutable_product_members'], 1142)
        self.assertTrue(report['true_raw_reader_preserved'])
        self.assertTrue(report['source_scope_only'])
        self.assertEqual(report['canonical_source_use_closures'], 0)
        self.assertFalse(report['current_coordinator_native_or_floor_qualified'])
        self.assertEqual(report['g11_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
