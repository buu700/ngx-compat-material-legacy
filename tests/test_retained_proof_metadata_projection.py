# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""The actual owner's pure projection preserves historical proof semantics."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[1]


class RetainedProofMetadataProjectionTests(unittest.TestCase):
    def test_actual_current_proofs_and_negative_semantic_changes(self):
        child=subprocess.run(['node','tests/retained_proof_metadata_projection_probe.mjs'],cwd=ROOT,
                             capture_output=True,text=True,timeout=60)
        self.assertEqual(child.returncode,0,child.stdout+child.stderr)
        row=json.loads(child.stdout)
        self.assertEqual((row['actual_landscape_projections'],row['actual_native_projections'],row['projected_member_occurrences']),(2,3,113))
        self.assertEqual(row['negative_controls'],12)
        self.assertTrue(row['inputs_and_outputs_isolated'])
        self.assertFalse(row['full_retained_preparation_executed'])
        self.assertFalse(row['artifact_or_audit_admission_granted'])
