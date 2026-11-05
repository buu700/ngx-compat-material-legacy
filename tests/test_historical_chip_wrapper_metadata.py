# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact original-source wrapper metadata cannot become audit/runtime credit."""
import json
from pathlib import Path
import subprocess
import sys
import unittest
ROOT = Path(__file__).resolve().parents[1]


class HistoricalChipWrapperMetadataTests(unittest.TestCase):
    def test_exact_transport_and_late_change_controls(self):
        child = subprocess.run(['node', 'tests/historical_chip_wrapper_metadata_probe.mjs'], cwd=ROOT,
                               text=True, capture_output=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        result = json.loads(child.stdout)
        # Historical complete JSON counts remain distinct from actual current source guards.
        from current_sass_canonical_test_scope import current_canonical_test_frame
        physical = current_canonical_test_frame(ROOT)
        self.assertTrue(result['historical_json_comparison_only'])
        self.assertTrue(result['original_program_authenticated_as_DATA'])
        self.assertFalse(result['original_program_executed'])
        self.assertTrue(result['current_physical_owner_guarded'])
        self.assertEqual(result['current_physical_source_admissions'], physical['individual_source_reviews'])
        self.assertEqual(result['current_physical_base_class_decisions'], physical['base_class_decisions'])
        self.assertEqual(result['current_nonphysical_ledger_rejections'], 4)
        physical['assert_current']()
        self.assertEqual((result['positive'], result['rejected']), (4, 15))
        self.assertEqual(result['original_hunks_preserved'], 198)
        self.assertFalse(result['native_or_G11_qualified'])

    def test_independent_entry_and_review_reconstruction(self):
        child = subprocess.run([sys.executable, 'tests/historical_chip_wrapper_ledger_patch.py'], cwd=ROOT,
                               text=True, capture_output=True, timeout=30)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        result = json.loads(child.stdout)
        self.assertTrue(result['canonical_applied'])
        self.assertEqual(result['metadata_entry_replacements'], 4)
        self.assertEqual(result['unchanged_other_entries'], 1693)
        self.assertEqual(result['original_dispositions_or_hunk_judgments_changed'], 0)
        self.assertFalse(result['actual_native_artifact_floor_or_G11_qualified'])


if __name__ == '__main__':
    unittest.main()
