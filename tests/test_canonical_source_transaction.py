# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Every family row, fresh compiler proof and cold/late mutation rejection."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CanonicalSourceTransactionTests(unittest.TestCase):
    def test_individual_rows_fresh_sources_and_mutation_rejection(self):
        command = ['node', 'tests/canonical_source_transaction_probe.mjs']
        if os.environ.get('CANONICAL_SOURCE_TRANSACTION_REPORT'):
            command.append(os.environ['CANONICAL_SOURCE_TRANSACTION_REPORT'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-8000:])
        report = json.loads(child.stdout)
        self.assertEqual(len(report['cases']), 4)
        self.assertEqual([row['metadata_rows'] for row in report['cases']], [2, 4, 2, 5])
        self.assertEqual([row['compiler_cases'] for row in report['cases']], [0, 0, 20, 14])
        self.assertEqual(report['individual_metadata_rows'], 13)
        self.assertEqual(report['fresh_whole_body_reviews'], 4)
        self.assertEqual(report['compiler_cases'], 34)
        self.assertEqual(len(report['rejected']), 100)
        self.assertEqual(len(set(report['rejected'])), 100)
        self.assertTrue(report['all_original_patch_guards_preserved'])
        self.assertTrue(report['no_prior_result_or_caller_compiler_hook'])
        self.assertTrue(report['late_entry_body_and_source_mutations_rejected'])
        self.assertEqual(report['canonical_dispositions_changed'], 0)
        self.assertEqual(report['source_admissions'], 61)
        self.assertFalse(report['actual_native_artifact_browser_floor_or_full_audit_qualified'])
        self.assertEqual(report['g11_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
