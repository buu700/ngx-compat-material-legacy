# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Three independent source admissions retain mandatory real native evidence."""
import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AutocompleteSelectionSourceAdmissionTests(unittest.TestCase):
    def test_source_proofs_and_real_native_gate_cannot_claim_unexecuted_runs(self):
        child = subprocess.run(['node', 'tests/autocomplete_selection_source_admission_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        result = json.loads(child.stdout)
        self.assertEqual(result['current_individual_source_proofs'], 3)
        self.assertEqual(result['original_hunks'], 10)
        self.assertEqual(result['exact_native_cases'], 9)
        self.assertEqual(result['exact_source_members_per_proof'], 23)
        self.assertEqual(result['rejections'], 35)
        self.assertTrue(result['missing_coordinator_run_rejected'])
        self.assertFalse(result['actual_native_browser_artifact_or_floor_executed'])

    def test_independent_three_entry_and_eleven_digest_reconstruction(self):
        child = subprocess.run([sys.executable, 'tests/autocomplete_selection_ledger_patch.py'],
                               cwd=ROOT, capture_output=True, text=True, timeout=45)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        result = json.loads(child.stdout)
        self.assertEqual(result['individual_source_admissions'], 3)
        self.assertEqual(result['registry_proof_digest_updates'], 11)
        self.assertEqual(result['literal_edits'], 16 if result['line'] == '21.x' else 14)
        self.assertEqual(result['unrelated_bytes_changed'], 0)
        self.assertTrue(result['canonical_applied'])
        self.assertFalse(result['native_floor_or_G11_qualified'])
