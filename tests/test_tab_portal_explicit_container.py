# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact caller-container repair against genuine public peers; no native admission."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TabPortalExplicitContainer(unittest.TestCase):
    def test_complete_source_types_lifecycle_factory_and_reversions(self):
        command = ['node', 'tests/tab_portal_explicit_container_probe.mjs']
        if os.environ.get('NGX_TAB_PORTAL_DIAGNOSTIC'):
            command.append(os.environ['NGX_TAB_PORTAL_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=240)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-14000:])
        report = json.loads(child.stdout)
        for name, expected in [('strict_type_subjects', 3), ('runtime_subjects', 10),
                               ('lifecycle_cases', 78), ('behavior_reversions_rejected', 80),
                               ('source_corruptions', 9), ('new_use_closures', 0)]:
            self.assertEqual(report[name], expected, name)
        self.assertFalse(report['actual_full_legacy_parent_native_packed_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
