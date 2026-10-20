# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Authenticated role preparation; current source admission has its own successor gate."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TabPortalSourceRequalification(unittest.TestCase):
    def test_exact_role_preparation_preserves_ledgers_and_rejects_corruption(self):
        command = ['node', 'tests/tab_portal_source_requalification_probe.mjs']
        if os.environ.get('NGX_TAB_PORTAL_SOURCE_DIAGNOSTIC'):
            command.append(os.environ['NGX_TAB_PORTAL_SOURCE_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-12000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['source_decisions_prepared'], 12)
        self.assertEqual(report['new_helper_decisions_prepared'], 7)
        self.assertEqual(report['native_case_ids_retained'], 54)
        self.assertEqual(report['corruptions_rejected'], 22)
        self.assertTrue(report['all17_authenticated_prior_members_preserved'])
        self.assertEqual(report['new_use_closures'], 0)
        self.assertFalse(report['current_source_history_or_native_admission'])
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
