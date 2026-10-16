# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Constructor source changes cannot waive the actual packed OnPush requirement."""
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class TableOnPushConstructorTests(unittest.TestCase):
    def test_source_dependency_and_unchanged_runtime_gate_controls(self):
        result = subprocess.run(['node', 'tests/table_onpush_constructor_requalification_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-7000:])
