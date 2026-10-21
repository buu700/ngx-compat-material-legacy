# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Binds bounded public/owned runtime receipts without granting native or packed credit."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class A11yCallerRuntime(unittest.TestCase):
    def test_bound_runtime_and_raw_input_guards(self):
        command = ['node', 'tests/a11y_caller_runtime_evidence_probe.mjs']
        if os.environ.get('NGX_A11Y_CALLER_RUNTIME_DIAGNOSTIC'):
            command.append(os.environ['NGX_A11Y_CALLER_RUNTIME_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['contexts'], 6)
        self.assertEqual(report['cases'], 74)
        self.assertEqual(report['owned_source_faults'], 6)
        self.assertGreaterEqual(report['source_input_corruptions_rejected'], 22)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertEqual(report['source_closures'], 0)
        self.assertFalse(report['actual_native_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
