# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Historical source/roster coherence; no runtime or audit qualification."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class HistoricalEightMatrixRosterTests(unittest.TestCase):
    def test_current_required_roster_and_original_bodies(self):
        child = subprocess.run(['node', 'tests/historical_eight_matrix_roster_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-5000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['result'], 'pass')
        self.assertEqual((report['source_families'], report['added_registrations'],
                          report['shifted_original_ids'], report['required_roster'],
                          report['discovery_negatives']), (4, 8, 333, 2341, 5))
        self.assertTrue(report['old_source_bodies_preserved'])
        self.assertFalse(report['historical_execution_reattributed'])
        self.assertFalse(report['artifact_or_audit_admission_granted'])
