# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Canonical tabs/select/chips credit must reject incomplete measured state."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CanonicalControlGeometryProbeTests(unittest.TestCase):
    def test_full_probe_geometry_fonts_and_form_state(self):
        command = ['node', 'tests/canonical_control_geometry_probe_contract.mjs']
        if os.environ.get('CLOSEOUT_CANONICAL_CONTROL_REPORT'):
            command.append(os.environ['CLOSEOUT_CANONICAL_CONTROL_REPORT'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['cases'], 31)
        self.assertEqual(report['mutation_rejections'], 3)
        self.assertFalse(report['native_executed'])
