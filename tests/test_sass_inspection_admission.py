# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Typed six-SHA source guards, real CLI controls and independent ledger bytes."""
import json
from pathlib import Path
import subprocess
import sys
import unittest
ROOT = Path(__file__).resolve().parents[1]


class SassInspectionAdmissionTests(unittest.TestCase):
    def test_current_source_proof_and_fresh_compiler(self):
        result = subprocess.run(['node','tests/sass_inspection_admission_probe.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=90)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(len(report['cases']),6)
        self.assertEqual(len(report['rejected']),19)
        self.assertEqual(report['individual_reviews'],6)
        self.assertEqual(report['original_hunks'],49)
        self.assertTrue(report['canonical_applied'])
        self.assertTrue(report['fresh_compiler_measurement_executed'])
        self.assertFalse(report['full_Sass_native_floor_or_G11_qualified'])

    def test_actual_root_cli_cannot_drop_optional_proof_markers(self):
        result = subprocess.run(['node','tests/sass_inspection_root_probe.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=240)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['actual_CLI_cases'],3)
        self.assertEqual(report['missing_marker_entries_rejected'],6)
        self.assertEqual(report['checker_mutants_detected'],1)
        self.assertEqual(report['frozen_authored_uses'],1736)
        self.assertEqual(report['additional_obligations'],315)
        self.assertTrue(report['root_mandatory_SHA_hook_covered'])
        self.assertFalse(report['full_1697_audit_executed'])

    def test_independent_exact_ledger_patch(self):
        result = subprocess.run([sys.executable,'tests/sass_inspection_ledger_patch.py'],cwd=ROOT,capture_output=True,text=True,timeout=30)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        report = json.loads(result.stdout)
        self.assertTrue(report['canonical_applied'])
        self.assertEqual(report['canonical_entries'],1697)
        self.assertEqual(report['individual_decisions_changed'],6)
        self.assertEqual(report['checker_source_digests_changed'],3)
        self.assertEqual(report['unrelated_entry_or_byte_changes'],0)
        self.assertFalse(report['full_Sass_native_floor_or_G11_qualified'])
