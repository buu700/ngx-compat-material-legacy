# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CheckerOwnedComparisonTests(unittest.TestCase):
    def test_actual_comparison_identity_faults_and_recovery(self):
        child = subprocess.run(['node', 'tests/checker_owned_comparison_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=600)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        row = json.loads(child.stdout)
        self.assertEqual(row['checks_passed'], 16)
        self.assertEqual((row['getters'], row['caller_equals_calls']), (0, 0))
        self.assertTrue(row['genuine_source_subject'])
        self.assertFalse(row['historical_program_executed'])
        self.assertFalse(row['artifact_or_audit_admission_granted'])
        self.assertEqual(row['g11_claim'], 'not-passed')
