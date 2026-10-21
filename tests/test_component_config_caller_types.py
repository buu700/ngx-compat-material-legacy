# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete selected configuration types do not imply runtime or canonical qualification."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ComponentConfigCallerTypes(unittest.TestCase):
    def test_genuine_minimum_types_and_raw_input_guards(self):
        command = ['node', 'tests/component_config_caller_type_evidence_probe.mjs']
        if os.environ.get('NGX_COMPONENT_CONFIG_TYPE_DIAGNOSTIC'):
            command.append(os.environ['NGX_COMPONENT_CONFIG_TYPE_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['selected_roles'], 73)
        self.assertEqual(report['current_graph_files'], 200)
        self.assertEqual(report['actual_bindings'], 73)
        self.assertEqual(report['live_peer_bindings'], 68)
        self.assertEqual(report['retained_owned_bindings'], 5)
        self.assertEqual(report['actual_member_references'], 66)
        self.assertEqual(report['invalid_typed_controls'], 21)
        self.assertGreaterEqual(report['source_input_corruptions_rejected'], 45)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertEqual(report['source_closures'], 0)
        self.assertFalse(report['defaults_service_or_owned_caller_runtime_qualified'])


if __name__ == '__main__':
    unittest.main()
