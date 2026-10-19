# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact public zone dependencies, optional lookup, lifecycle and genuine Node callback capture."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]


class TabZoneUseReview(unittest.TestCase):
    def test_header_reentry_observers_and_body_optional_service_real_tasks(self):
        command = ['node', '--max-old-space-size=640', 'tests/tab_zone_use_probe.mjs']
        if os.environ.get('NGX_TAB_ZONE_USE_DIAGNOSTIC'):
            command.append(os.environ['NGX_TAB_ZONE_USE_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=150)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-12000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['source_imports'], 2)
        self.assertEqual(report['genuine_zone_subjects'], 10)
        self.assertEqual(report['supplement_cases'], 80)
        self.assertEqual(report['supplement_faults'], 82)
        self.assertEqual(report['source_declaration_evidence_controls'], 16)
        self.assertEqual(report['reused_header_subjects'], 10)
        self.assertEqual(report['reused_header_faults'], 32)
        self.assertEqual(report['original_body_cases'], 47)
        self.assertEqual(report['original_body_faults'], 22)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
