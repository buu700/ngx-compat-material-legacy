# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
import json
from pathlib import Path
import subprocess
import sys
import unittest


class HistoricalConsumerWrapperMetadataTests(unittest.TestCase):
    def test_independent_exact_reconstruction(self):
        root = Path(__file__).resolve().parents[1]
        child = subprocess.run([sys.executable, 'tests/historical_consumer_wrapper_ledger_patch.py'], cwd=root,
                               capture_output=True, text=True, timeout=30)
        self.assertEqual(child.returncode, 0, child.stderr[-4000:])
        result = json.loads(child.stdout)
        self.assertEqual(result['metadata_entries'], 65)
        self.assertEqual(result['other_entries_preserved'], 1632)
        self.assertEqual(result['original_hunks_preserved'], 7770)

    def test_shared_owner_classification_and_rejections(self):
        root = Path(__file__).resolve().parents[1]
        child = subprocess.run(['node', 'tests/historical_consumer_wrapper_metadata_probe.mjs'], cwd=root,
                               capture_output=True, text=True, timeout=180)
        self.assertEqual(child.returncode, 0, child.stderr[-5000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['metadata_positive_cases'], 3)
        self.assertEqual(report['rejection_controls'], 12)
        self.assertEqual(report['metadata_entries'], 65)
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])


if __name__ == '__main__':
    unittest.main()
