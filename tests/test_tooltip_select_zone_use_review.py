# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact local/inherited zone receivers and genuine callback/Promise context observations."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]


class TooltipSelectZoneUseReview(unittest.TestCase):
    def test_service_identity_inherited_forwarding_and_tooltip_callback_contexts(self):
        command = ['node', '--max-old-space-size=640', 'tests/tooltip_select_zone_use_probe.mjs']
        if os.environ.get('NGX_TOOLTIP_SELECT_ZONE_USE_DIAGNOSTIC'):
            command.append(os.environ['NGX_TOOLTIP_SELECT_ZONE_USE_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=150)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-12000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['source_imports'], 2)
        self.assertEqual(report['genuine_zone_subjects'], 10)
        self.assertEqual(report['supplement_cases'], 60)
        self.assertEqual(report['supplement_faults'], 40)
        self.assertEqual(report['source_declaration_evidence_controls'], 16)
        self.assertEqual(report['fresh_original_subjects'], 20)
        self.assertEqual(report['fresh_original_faults'], 92)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
