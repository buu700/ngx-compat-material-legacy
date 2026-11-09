# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""A complete source operation never admits partial or changed metadata."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SassSourceStageTests(unittest.TestCase):
    def test_metadata_rejections_before_callbacks(self):
        child = subprocess.run(['node', 'tests/sass_source_stage_probe.mjs', 'metadata'],
                               cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        row = json.loads(child.stdout)
        self.assertEqual(row['checks_passed'], 18)
        self.assertEqual((row['provided_reads'], row['getters']), (0, 0))

    def test_actual_batch_guard_rejection_and_recovery(self):
        child = subprocess.run(['node', 'tests/sass_source_stage_probe.mjs', 'guards'],
                               cwd=ROOT, capture_output=True, text=True, timeout=600)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        row = json.loads(child.stdout)
        self.assertEqual(row['checks_passed'], 16)
        self.assertEqual(row['decisions'], 6)
