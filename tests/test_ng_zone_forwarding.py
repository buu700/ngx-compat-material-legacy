# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""NgZone forwarding preserves actual caller identity and historical initialization."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class NgZoneForwardingTests(unittest.TestCase):
    def test_full_construction_phase_identity_and_mutants(self):
        command = ['node', '--max-old-space-size=512', 'tests/ng_zone_forwarding_runtime_probe.mjs']
        if os.environ.get('CLOSEOUT_NG_ZONE_FORWARDING_REPORT'):
            command.append(os.environ['CLOSEOUT_NG_ZONE_FORWARDING_REPORT'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['forwarding_uses'], 7)
        self.assertEqual(report['subjects'], 10)
        self.assertEqual(report['construction_phases'], 8)
        self.assertEqual(report['construction_cases'], 80)
        self.assertEqual(report['mutation_rejections'], 240)
        self.assertEqual(report['source_controls'], 8)
        self.assertFalse(report['native_or_packed_qualified'])
