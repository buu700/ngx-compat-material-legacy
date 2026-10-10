# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Canonical tooltip credit requires completed native lifetime observations."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CanonicalOverlayProbeTests(unittest.TestCase):
    def test_complete_probe_rejects_incomplete_lifecycle_and_stale_callbacks(self):
        command = ['node', 'tests/canonical_overlay_probe_contract.mjs']
        if os.environ.get('CLOSEOUT_CANONICAL_OVERLAY_REPORT'):
            command.append(os.environ['CLOSEOUT_CANONICAL_OVERLAY_REPORT'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['cases'], 34)
        self.assertEqual(report['mutation_rejections'], 2)
        self.assertEqual(report['generated_fixtures'], 2)
        self.assertFalse(report['native_executed'])
