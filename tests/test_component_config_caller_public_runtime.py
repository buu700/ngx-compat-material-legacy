# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Public SDK snapshots retain differences without granting owned/native qualification."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ComponentConfigCallerPublicRuntime(unittest.TestCase):
    def test_public_sdk_observations_and_raw_input_guards(self):
        command = ['node', 'tests/component_config_caller_public_runtime_evidence_probe.mjs']
        if os.environ.get('NGX_COMPONENT_CONFIG_PUBLIC_RUNTIME_DIAGNOSTIC'):
            command.append(os.environ['NGX_COMPONENT_CONFIG_PUBLIC_RUNTIME_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-7000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['contexts'], 6)
        self.assertEqual(report['cases'], 210)
        self.assertEqual(report['public_default_difference_records_retained'], 8)
        self.assertEqual(report['source_input_corruptions_rejected'], 16)
        self.assertEqual(report['late_changes_rejected'], 2)
        self.assertEqual(report['source_closures'], 0)
        self.assertFalse(report['actual_owned_callers_executed'])
        self.assertFalse(report['actual_native_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
