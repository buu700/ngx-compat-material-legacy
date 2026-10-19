# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""One public zone boundary, with explicit protocol and accelerated-clock limits."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]


class CheckboxZoneUseReview(unittest.TestCase):
    def test_required_service_and_outside_registration_and_callback_context(self):
        command = ['node', '--max-old-space-size=640', 'tests/checkbox_zone_use_probe.mjs']
        if os.environ.get('NGX_CHECKBOX_ZONE_USE_DIAGNOSTIC'):
            command.append(os.environ['NGX_CHECKBOX_ZONE_USE_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=150)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-12000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['source_imports'], 1)
        self.assertEqual(report['genuine_zone_subjects'], 10)
        self.assertEqual(report['current_protocol_cases'], 80)
        self.assertEqual(report['runtime_faults_rejected'], 82)
        self.assertEqual(report['source_declaration_controls'], 13)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
