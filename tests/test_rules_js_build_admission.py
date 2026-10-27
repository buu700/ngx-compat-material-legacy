# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Mandatory real-root build exclusions and independently reconstructed bytes."""
import json
from pathlib import Path
import subprocess
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1]

class RulesJsBuildAdmissionTests(unittest.TestCase):
    def probe(self,command,timeout):
        child=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=timeout)
        self.assertEqual(child.returncode,0,child.stdout+child.stderr)
        return json.loads(child.stdout)

    def test_source_proof_and_corruptions(self):
        row=self.probe(['node','tests/rules_js_build_admission_probe.mjs'],90)
        self.assertEqual(len(row['cases']),3)
        self.assertEqual(len(row['rejected']),20)
        self.assertEqual(row['original_file_occurrences'],135)
        self.assertEqual(row['original_hunks'],195)
        self.assertTrue(row['canonical_applied'])
        self.assertTrue(row['fresh_original_and_current_source_check'])
        self.assertFalse(row['current_native_packed_or_floor_or_G11_qualified'])

    def test_real_root_cannot_drop_proof_markers(self):
        row=self.probe(['node','tests/rules_js_build_root_probe.mjs'],240)
        self.assertEqual(row['actual_CLI_cases'],3)
        self.assertEqual(row['missing_marker_entries_rejected'],3)
        self.assertEqual(row['checker_mutants_detected'],1)
        self.assertEqual(row['frozen_authored_uses'],1736)
        self.assertEqual(row['additional_obligations'],315)
        self.assertFalse(row['full_1697_audit_executed'])
        self.assertFalse(row['native_floor_or_G11_qualified'])

    def test_independent_exact_ledger_bytes(self):
        row=self.probe([sys.executable,'tests/rules_js_build_ledger_patch.py'],30)
        self.assertTrue(row['canonical_applied'])
        self.assertEqual(row['canonical_entries'],1697)
        self.assertEqual(row['individual_decisions_changed'],3)
        self.assertEqual(row['checker_source_digests_changed'],3)
        self.assertEqual(row['unrelated_entry_or_byte_changes'],0)
        self.assertFalse(row['current_native_packed_or_floor_or_G11_qualified'])
