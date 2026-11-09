# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CheckerContextOwnershipTests(unittest.TestCase):
    def test_actual_context_frames_guards_wrappers_and_recovery(self):
        child = subprocess.run(['node', 'tests/checker_context_ownership_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=600)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        report = json.loads(child.stdout)
        self.assertEqual(report['checks_passed'], 16)
        self.assertTrue(report['genuine_producer_and_fresh_verifier'])
        self.assertFalse(report['historical_program_executed'])
        self.assertFalse(report['artifact_or_audit_admission_granted'])
        self.assertEqual(report['g11_claim'], 'not-passed')
