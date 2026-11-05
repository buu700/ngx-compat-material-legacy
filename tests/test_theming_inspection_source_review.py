# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Complete original patches and current owned Sass exclusion, without admission."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ThemingInspectionSourceReviewTests(unittest.TestCase):
    def test_whole_originals_and_current_ownership_mutations(self):
        command = ['node', 'tests/theming_inspection_source_review_probe.mjs']
        if os.environ.get('THEMING_INSPECTION_SOURCE_REPORT'):
            command.append(os.environ['THEMING_INSPECTION_SOURCE_REPORT'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['source_bindings'], report['expected_source_bindings'])
        self.assertTrue(report['current_source_bindings_match_exact_successor'])
        self.assertEqual(report['original_files'], 11)
        self.assertEqual(report['original_hunks'], 16)
        self.assertEqual(report['present_original_blobs'], 18)
        self.assertEqual(report['tagged_blobs'], 4)
        self.assertEqual(report['exact_patch_replays'], 11)
        self.assertEqual(report['byte_identical_test_relocations'], 1)
        self.assertEqual(report['proposed_individual_source_decisions'], 2)
        self.assertEqual(report['historical_exported_functions'], 25)
        self.assertEqual(report['owned_scss_members'], 409)
        self.assertEqual(report['historical_source_bindings'], 605)
        self.assertEqual(len(report['rejected']), 36)
        self.assertEqual(len(set(report['rejected'])), 36)
        self.assertEqual(report['canonical_decisions_changed'], 0)
        self.assertFalse(report['fresh_compiler_execution_this_review'])
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])
        self.assertEqual(report['g11_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
