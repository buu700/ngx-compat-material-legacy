# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Every original dialog role retains an individual current-source decision."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DialogCallerReview(unittest.TestCase):
    def test_eighteen_current_roles_and_public_peer_fields(self):
        result = subprocess.run(['node', 'tests/dialog_caller_review_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['prepared_individual_reviews'], 18)
        self.assertEqual(report['stable_public_peer'], 16)
        self.assertEqual(report['owned_replacement'], 1)
        self.assertEqual(report['retained_removed_use'], 1)
        self.assertEqual(report['corruptions_rejected'], 9)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertTrue(report['canonical_ledgers_unchanged'])
        self.assertEqual(report['canonical_writes_performed'], 0)


if __name__ == '__main__':
    unittest.main()
