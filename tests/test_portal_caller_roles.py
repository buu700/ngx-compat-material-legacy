# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Historical callback behavior survives supported public portal dispatch."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PortalCallerRoles(unittest.TestCase):
    def test_supported_public_declarations_tagged_behavior_and_failure_recovery(self):
        command = ['node', 'tests/portal_caller_roles_probe.mjs']
        if os.environ.get('NGX_PORTAL_ROLES_DIAGNOSTIC'):
            command.append(os.environ['NGX_PORTAL_ROLES_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=240)
        self.assertEqual(child.returncode, 0, (child.stdout+child.stderr)[-14000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['individual_caller_roles'], 25)
        self.assertEqual(report['current_source_files'], 13)
        self.assertEqual(report['identifier_uses'], 36)
        self.assertEqual(report['complete_enclosing_members'], 47)
        self.assertGreater(report['source_and_evidence_corruptions_rejected'], 20)
        self.assertTrue(report['late_mutation_rejected'])
        self.assertEqual(report['source_closures_integrated'], 0)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
