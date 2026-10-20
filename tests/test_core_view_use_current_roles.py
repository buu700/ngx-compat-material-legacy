# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Individual current Core caller decisions preserve source and older tasks."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CurrentCoreViewRoles(unittest.TestCase):
    def test_current_callers_exact_source_closures_and_rejection_controls(self):
        command = ['node', 'tests/core_view_use_current_roles_integration_probe.mjs']
        if os.environ.get('NGX_CORE_ROLE_DIAGNOSTIC'):
            command.append(os.environ['NGX_CORE_ROLE_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=240)
        self.assertEqual(child.returncode, 0, (child.stdout+child.stderr)[-14000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['selected_current_callers_reviewed'], 35)
        self.assertEqual(report['frozen_source_closures'], 26)
        self.assertEqual(report['additional_source_closures'], 9)
        self.assertEqual(report['frozen_reviewed'], 1490)
        self.assertEqual(report['additional_reviewed'], 194)
        self.assertEqual(report['insufficient'], 0)
        self.assertEqual(report['frozen_open']+report['additional_open'], 367)
        self.assertGreater(report['rejection_controls'], 40)
        self.assertTrue(report['late_mutation_rejected'])
        self.assertFalse(report['actual_legacy_component_native_packed_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
