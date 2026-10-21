# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current public a11y types stay distinct from historical annotations and runtime proof."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class A11yCallerTypes(unittest.TestCase):
    def test_genuine_types_and_raw_input_guards(self):
        command = ['node', 'tests/a11y_caller_type_evidence_probe.mjs']
        if os.environ.get('NGX_A11Y_CALLER_TYPE_DIAGNOSTIC'):
            command.append(os.environ['NGX_A11Y_CALLER_TYPE_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['current_graph_files'], 118)
        self.assertEqual(report['actual_resolved_calls'], 12)
        self.assertEqual(report['actual_member_references'], 21)
        self.assertGreaterEqual(report['source_input_corruptions_rejected'], 19)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertEqual(report['source_closures'], 0)
        self.assertFalse(report['service_or_owned_caller_runtime_qualified'])
if __name__ == '__main__':
    unittest.main()
