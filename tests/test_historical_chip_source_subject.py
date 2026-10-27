# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Historical source controls and actual current source keep separate subjects."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class HistoricalChipSourceSubjectTests(unittest.TestCase):
    def test_current_shared_owner_and_named_empty_query_contract(self):
        child = subprocess.run(['node', 'scripts/historical-chip-current-subject.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        result = json.loads(child.stdout)
        self.assertEqual(result['product_members'], 1142)
        self.assertEqual(result['owned_case_identities'], 2231)
        self.assertEqual(result['full_case_ids'], 2236)
        self.assertTrue(result['named_empty_query_regression_preserved'])
        self.assertFalse(result['historical_source_substituted'])
        self.assertFalse(result['native_or_G13_qualified'])

    def test_historical_or_changed_source_cannot_be_labeled_current(self):
        child = subprocess.run(['node', 'tests/historical_chip_current_rejection_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        result = json.loads(child.stdout)
        self.assertEqual(result['historical_or_unreviewed_current_sources_rejected'], 4)
        self.assertFalse(result['native_or_G11_qualified'])

    def test_unknown_historical_family_fails(self):
        child = subprocess.run(['node', 'scripts/run-historical-source-inspector.mjs', '--family', 'unknown'],
                               cwd=ROOT, capture_output=True, text=True, timeout=10)
        self.assertNotEqual(child.returncode, 0)
        self.assertIn('unknown historical source family', child.stderr)


if __name__ == '__main__':
    unittest.main()
