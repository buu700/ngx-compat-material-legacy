# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Public fixture type contract and captured producer cleanup with genuine view lifetimes."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FixtureLifecycleProducer(unittest.TestCase):
    def test_public_state_contract_and_actual_captured_cleanup(self):
        command = ['node', 'tests/fixture_lifecycle_producer_probe.mjs']
        if os.environ.get('NGX_FIXTURE_LIFECYCLE_DIAGNOSTIC'):
            command.append(os.environ['NGX_FIXTURE_LIFECYCLE_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=210)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-10000:])
        result = json.loads(child.stdout)
        for key, value in [('producer_files',7),('state_and_cleanup_expressions',14),('type_subjects',3),
                           ('negative_type_checks',12),('original_missing_property_errors',42),
                           ('public_runtime_subjects',10),('protocol_cases',260),
                           ('behavior_faults_rejected',280),('source_controls_rejected',14)]:
            self.assertEqual(result[key], value, key)
        self.assertFalse(result['actual_TestBed_ComponentFixture_or_legacy_control_executed'])
        self.assertFalse(result['native_browser_or_packed_qualified'])
