# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete owned protocols stay distinct from generated and native Angular execution."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ComponentConfigCallerOwnedRuntime(unittest.TestCase):
    def test_complete_owned_protocols_and_raw_input_guards(self):
        command = ['node', 'tests/component_config_caller_owned_evidence_probe.mjs']
        if os.environ.get('NGX_COMPONENT_CONFIG_OWNED_DIAGNOSTIC'):
            command.append(os.environ['NGX_COMPONENT_CONFIG_OWNED_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['actual_current_source_files'], 200)
        self.assertEqual(report['contexts'], 4)
        self.assertEqual(report['cases'], 46)
        self.assertEqual(report['actual_source_faults_rejected'], 10)
        self.assertGreaterEqual(report['source_input_corruptions_rejected'], 23)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertEqual(report['source_closures'], 0)
        self.assertFalse(report['generated_Angular_factory_template_or_query_execution'])
        self.assertFalse(report['actual_native_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
