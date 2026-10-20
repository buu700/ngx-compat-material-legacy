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


class DialogPortalFailureRecovery(unittest.TestCase):
    def test_supported_public_declarations_tagged_behavior_and_failure_recovery(self):
        command = ['node', 'tests/dialog_portal_failure_recovery_probe.mjs']
        if os.environ.get('NGX_DIALOG_PORTAL_DIAGNOSTIC'):
            command.append(os.environ['NGX_DIALOG_PORTAL_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=240)
        self.assertEqual(child.returncode, 0, (child.stdout+child.stderr)[-14000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['strict_type_models'], 3)
        self.assertEqual(report['runtime_subjects'], 10)
        self.assertEqual(report['caller_cases'], 160)
        self.assertEqual(report['behavior_faults_rejected'], 65)
        self.assertTrue(report['actual_prior_regressions_reproduced'])
        self.assertEqual(report['new_semantic_closures'], 0)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
