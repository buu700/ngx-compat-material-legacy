# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Whole original title patch admission prerequisite; no native evidence."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DialogTitleOriginalSubjectTests(unittest.TestCase):
    def test_complete_original_patch_and_rejection_controls(self):
        command = ['node', 'tests/dialog_title_original_subject_probe.mjs']
        if os.environ.get('DIALOG_TITLE_ORIGINAL_SUBJECT_REPORT'):
            command.append(os.environ['DIALOG_TITLE_ORIGINAL_SUBJECT_REPORT'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6500:])
        report = json.loads(child.stdout)
        self.assertEqual(report['original_files'], 9)
        self.assertEqual(report['original_hunks'], 21)
        self.assertEqual(report['verified_original_blobs'], 18)
        self.assertEqual(report['verified_tagged_blobs'], 18)
        self.assertEqual(report['exact_patch_replays'], 9)
        self.assertEqual(report['exact_tagged_after_images'], 9)
        self.assertEqual(len(report['rejections']), 38)
        self.assertEqual(len(set(report['rejections'])), 38)
        self.assertFalse(report['upstream_code_executed'])
        self.assertEqual(report['canonical_decisions_changed'], 0)
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])
        self.assertEqual(report['g11_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
