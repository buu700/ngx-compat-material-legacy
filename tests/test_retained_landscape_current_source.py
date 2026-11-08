# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Historical landscape metadata stays separate from actual current source."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RetainedLandscapeCurrentSourceTests(unittest.TestCase):
    def test_current_source_and_exact_program_guards(self):
        child = subprocess.run(['node', 'tests/retained_landscape_current_source_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        row = json.loads(child.stdout)
        self.assertEqual((row['programs'], row['program_bound']), (2, 13))
        self.assertEqual((row['program_cold_rejections'], row['program_late_rejections'], row['program_recoveries']), (13, 13, 13))
        self.assertEqual((row['current_source_bound'], row['source_cold_rejections'], row['source_late_rejections'], row['source_recoveries']), (69, 69, 69, 69))
        self.assertEqual((row['current_cases_each_minimum'], row['retained_minimums'], row['behavioral_mutants_rejected']), (7, 2, 6))
        self.assertEqual((row['current_matrix_obligations'], row['exact_native_source_members']), (2334, 22))
        for field in ['historical_report_body_equal', 'unknown_hash_rejected', 'wrong_length_rejected',
                      'accessor_not_invoked', 'public_metadata_isolated', 'physical_cross_member_mutation_rejected',
                      'installed_peer_mutation_rejected', 'late_peer_retarget_rejected']:
            self.assertTrue(row[field], field)
        self.assertFalse(row['actual_native_browser_artifact_or_floor_executed'])
        self.assertEqual(row['g11_claim'], 'not-passed')
