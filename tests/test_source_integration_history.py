# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact original source integration programs and their command-only redirects."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SourceIntegrationHistory(unittest.TestCase):
    def test_registered_frames_and_unchanged_assertions(self):
        child = subprocess.run(['node', 'tests/source_integration_history_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(child.returncode, 0, child.stdout + child.stderr)
        report = json.loads(child.stdout)
        self.assertEqual(report['source_integration_programs'], 8)
        self.assertEqual(report['immutable_frames'], 4)
        self.assertEqual(report['corruptions_rejected'], 10)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertEqual(report['invalid_CLI_requests_rejected'], 4)
        self.assertTrue(report['original_programs_and_Python_assertions_unchanged'])
        self.assertTrue(report['original_child_timeouts_unchanged'])
        self.assertFalse(report['old_programs_executed_by_this_guard'])


if __name__ == '__main__':
    unittest.main()
