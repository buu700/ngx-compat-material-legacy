# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Finite late-stage program descriptors never grant source or audit credit."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RetainedLaterStageProgramSourceTests(unittest.TestCase):
    def test_history_descriptors_and_physical_guards(self):
        child = subprocess.run(['node', 'tests/retained_later_stage_program_source_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        report = json.loads(child.stdout)
        self.assertEqual((report['programs'], report['bound'], report['known_step_descriptors']), (3, 20, 10))
        self.assertEqual((report['cold_rejections'], report['late_rejections'], report['recoveries']), (20, 20, 20))
        for field in ['unknown_hash_rejected', 'wrong_length_rejected', 'accessor_not_invoked',
                      'proxy_not_invoked', 'public_metadata_isolated', 'physical_cross_member_mutation_rejected']:
            self.assertTrue(report[field], field)
        self.assertFalse(report['historical_code_executed_or_exposed'])
        self.assertFalse(report['artifact_or_audit_admission_granted'])
