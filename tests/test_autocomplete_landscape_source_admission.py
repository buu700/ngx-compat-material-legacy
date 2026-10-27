# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Canonical source review is complete; real artifact admission stays separate."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AutocompleteLandscapeSourceAdmissionTests(unittest.TestCase):
    def test_independent_exact_ledger_reconstruction(self):
        result = subprocess.run(['python3', 'tests/autocomplete_landscape_ledger_patch.py'],
                                cwd=ROOT, capture_output=True, text=True, timeout=45)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-6000:])
        observed = json.loads(result.stdout)
        self.assertEqual(observed['canonical_entries'], 1697)
        self.assertEqual(observed['individual_source_decisions'], 1)
        self.assertEqual(observed['registry_digest_updates'], 10)
        self.assertEqual(observed['total_literal_edits'], 13 if observed['line'] == '21.x' else 11)
        self.assertEqual(observed['unrelated_byte_changes'], 0)
        self.assertFalse(observed['native_packed_floor_G11_qualified'])

    def test_current_source_proof_cannot_grant_unexecuted_native_admission(self):
        result = subprocess.run(['node', 'tests/autocomplete_landscape_source_admission_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=45)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-6000:])
        observed = json.loads(result.stdout)
        self.assertTrue(observed['current_individual_source_proof_valid'])
        self.assertTrue(observed['missing_coordinator_run_rejected'])
        self.assertTrue(observed['wrong_source_line_rejected'])
        self.assertEqual(observed['exact_named_native_cases'], 5)
        self.assertEqual(observed['exact_native_source_members'], 22)
        self.assertFalse(observed['actual_browser_artifact_or_floor_executed'])
