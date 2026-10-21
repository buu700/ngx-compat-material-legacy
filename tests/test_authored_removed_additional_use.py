# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""A qualified live import removal cannot shrink the original audit roster."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class AuthoredRemovedAdditionalUse(unittest.TestCase):
    def test_original_roster_retirement_and_actual_predicate_faults(self):
        command = ['node', 'tests/authored_removed_additional_use_probe.mjs']
        if os.environ.get('NGX_AUTHORED_REMOVED_DIAGNOSTIC'):
            command.append(os.environ['NGX_AUTHORED_REMOVED_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['current_live_uses'], 1964)
        self.assertEqual(report['live_additional_uses'], 314)
        self.assertEqual(report['retained_additional_obligations'], 315)
        self.assertEqual(report['retained_removed_obligations'], 1)
        self.assertTrue(report['positive_complete_validator_fixture'])
        self.assertGreaterEqual(report['admission_controls_rejected'], 25)
        self.assertEqual(report['late_changes_rejected'], 1)
        self.assertEqual(report['actual_admission_mutants_detected'], 2)
        self.assertTrue(report['supplied_candidate_metadata_cannot_shrink_original_roster'])
        self.assertFalse(report['synthetic_review_records_written_to_canonical_ledgers'])
        self.assertFalse(report['product_semantic_or_G11_qualification'])
if __name__ == '__main__':
    unittest.main()
