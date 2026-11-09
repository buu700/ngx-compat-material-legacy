# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Source helper closes callbacks before admitting a historical wrapper identity."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RetainedWrapperFrameTests(unittest.TestCase):
    def test_source_guards_and_exact_old_wrapper_data(self):
        child = subprocess.run(['node', 'tests/retained_wrapper_frame_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        report = json.loads(child.stdout)
        self.assertEqual((report['bound'], report['transitions']), (126, 7))
        for field in ['old_source_reader_rejected', 'late_old_source_reader_rejected',
                      'warm_cold_restore_before_callback_rejected', 'caught_reentry_rejected',
                      'changed_input_metadata_rejected']:
            self.assertTrue(report[field], field)
        self.assertEqual(report['accessor_calls'], 0)
        self.assertFalse(report['historical_programs_executed'])
        self.assertFalse(report['artifact_or_audit_admission_granted'])
