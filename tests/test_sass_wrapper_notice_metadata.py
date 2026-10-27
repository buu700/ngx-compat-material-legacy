# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Current metadata cannot overwrite historical judgments or claim execution."""
import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SassWrapperNoticeMetadataTests(unittest.TestCase):
    def test_current_source_metadata_and_original_receipt_controls(self):
        child = subprocess.run(['node', 'tests/sass_wrapper_notice_metadata_probe.mjs'], cwd=ROOT,
                               text=True, capture_output=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        result = json.loads(child.stdout)
        self.assertEqual((result['positive'], result['rejected']), (6, 16))
        self.assertEqual(result['original_hunks_preserved'], 474)
        self.assertEqual(result['new_SHA_decisions'], 0)
        self.assertFalse(result['native_or_G11_qualified'])

    def test_independent_twelve_entry_and_review_preservation(self):
        child = subprocess.run([sys.executable, 'tests/sass_wrapper_notice_ledger_patch.py'], cwd=ROOT,
                               text=True, capture_output=True, timeout=30)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        result = json.loads(child.stdout)
        self.assertTrue(result['canonical_applied'])
        self.assertEqual(result['metadata_entry_replacements'], 12)
        self.assertEqual(result['source_reference_updates'], 20)
        self.assertEqual(result['report_digest_updates'], 4)
        self.assertEqual(result['unchanged_other_entries'], 1685)
        self.assertEqual(result['disposition_or_original_hunk_judgments_changed'], 0)
        self.assertEqual(result['unrelated_entry_or_byte_changes'], 0)
        self.assertFalse(result['actual_native_artifact_floor_or_G11_qualified'])


if __name__ == '__main__':
    unittest.main()
