# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Scoped public zone supplement; authentic existing render observations are reused explicitly."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]


class FormMenuZoneUseReview(unittest.TestCase):
    def test_service_bindings_zone_context_optional_fallback_and_evidence_identity(self):
        command = ['node', '--max-old-space-size=640', 'tests/form_menu_zone_use_probe.mjs']
        if os.environ.get('NGX_FORM_MENU_ZONE_USE_DIAGNOSTIC'):
            command.append(os.environ['NGX_FORM_MENU_ZONE_USE_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=150)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-12000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['source_imports'], 2)
        self.assertEqual(report['genuine_zone_subjects'], 10)
        self.assertEqual(report['fresh_protocol_cases'], 100)
        self.assertEqual(report['fresh_runtime_faults_rejected'], 78)
        self.assertEqual(report['source_declaration_controls'], 16)
        self.assertEqual(report['reused_subjects'], 10)
        self.assertEqual(report['reused_faults'], 120)
        self.assertFalse(report['reused_execution_rerun'])
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
