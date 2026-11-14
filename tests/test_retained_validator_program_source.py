# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Finite source-program identities grant no historical reader or audit pass."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RetainedValidatorProgramSourceTests(unittest.TestCase):
    def test_program_identities_and_physical_guards(self):
        child = subprocess.run(['node', 'tests/retained_validator_program_source_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        report = json.loads(child.stdout)
        self.assertEqual(report['programs'], 3)
        self.assertEqual((report['cold_rejections'], report['late_rejections'], report['recoveries']), (22, 22, 22))
        for field in ['unknown_hash_rejected', 'wrong_length_rejected', 'accessor_not_invoked',
                      'public_metadata_isolated', 'physical_cross_member_mutation_rejected',
                      'caught_reentry_rejected_and_recovered']:
            self.assertTrue(report[field], field)
        self.assertFalse(report['historical_code_executed_or_exposed'])
        self.assertFalse(report['artifact_or_audit_admission_granted'])
