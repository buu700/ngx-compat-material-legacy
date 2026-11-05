# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Whole legacy source comparison retains exact current Sass guards."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class LegacyRemovalCurrentSassBoundaryTests(unittest.TestCase):
    def test_five_current_references_and_physical_callback_guards(self):
        result = subprocess.run(['node', 'tests/parent-legacy-removal-current-sass-boundary-probe-v1.mjs'],
                                cwd=ROOT, text=True, capture_output=True, timeout=90)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-6000:])
        report = json.loads(result.stdout)
        self.assertEqual(report['status'], 'pass')
        self.assertEqual(report['checks_passed'], 9)
        self.assertEqual(report['original_product_reference_successors'], 4)
        self.assertEqual(report['current_sass_reference_successors'], 5)
        self.assertTrue(report['complete_legacy_source_review_executed'])
        self.assertEqual(report['product_file_mutations'], 0)
        self.assertFalse(report['complete_shared_owner_executed'])
        self.assertFalse(report['Sass_compiler_or_build_executed'])


if __name__ == '__main__':
    unittest.main()
