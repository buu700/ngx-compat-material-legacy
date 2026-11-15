# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite Core source roles, with no DI or runtime qualification."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreThreeSourceSuccessor(unittest.TestCase):
    def test_source_roles_and_controls(self):
        result = subprocess.run(['node', 'tests/upstream/core-three-source-successor-2e270.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['selected_rows'], 18)
        self.assertEqual(report['old_current_role_comparisons'], 10)
        self.assertEqual(report['selected_row_mutations'], 3)
        self.assertTrue(report['unrelated_live_bytes_preserved'])
        self.assertTrue(report['wrong_git_before_read_rejected'])
        self.assertEqual(report['installed_core'], '22.1.7')
        self.assertFalse(report['actual_di_native_scheduler_floor_qualified'])
        self.assertEqual(report['g11_claim'], 'not-passed')
