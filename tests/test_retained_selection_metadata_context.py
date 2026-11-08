# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Historical native metadata maps explicitly to authenticated current source."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RetainedSelectionMetadataContextTests(unittest.TestCase):
    def test_exact_metadata_projection_and_current_guards(self):
        child = subprocess.run(['node', 'tests/retained_selection_metadata_context_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        row = json.loads(child.stdout)
        self.assertEqual((row['historical_members'], row['current_members'], row['bound']), (34, 40, 45))
        self.assertEqual((row['cold_rejections'], row['late_rejections'], row['recoveries']), (45, 45, 45))
        self.assertEqual((row['historical_matrix_obligations'], row['current_matrix_obligations']), (2236, 2334))
        self.assertTrue(row['all_historical_matrix_obligations_retained'])
        self.assertEqual((row['unchanged_report_bodies'], row['exact_historical_proof_projections'], row['projected_member_occurrences']), (3, 3, 69))
        for field in ['actual_source_bound_equal', 'unknown_hash_rejected', 'wrong_length_rejected',
                      'accessor_not_invoked', 'proxy_not_invoked', 'public_metadata_isolated',
                      'physical_cross_member_mutation_rejected']:
            self.assertTrue(row[field], field)
        self.assertFalse(row['historical_code_executed_or_exposed'])
        self.assertFalse(row['artifact_or_audit_admission_granted'])
