# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Discoverable exact-key table source-review controls."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class TableOutletClassSourceReview(unittest.TestCase):
    def test_six_exact_source_rows_and_conflicts(self):
        result = subprocess.run(['node', 'tests/table_outlet_class_source_review_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=45)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['rows'], 6)
        self.assertEqual(report['mutation_targets'], 4)
        self.assertFalse(report['physical_owner_exercised'])
        self.assertFalse(report['runtime_or_g11_claim'])

if __name__ == '__main__':
    unittest.main()
