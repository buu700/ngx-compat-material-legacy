# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Genuine public zone context and owned chip lifecycle; explicit DOM protocols."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]


class ChipZoneUseReview(unittest.TestCase):
    def test_complete_current_chip_with_original_and_minimum_public_zones(self):
        command = ['node', '--max-old-space-size=640', 'tests/chip_zone_use_probe.mjs']
        if os.environ.get('NGX_CHIP_ZONE_USE_DIAGNOSTIC'):
            command.append(os.environ['NGX_CHIP_ZONE_USE_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=150)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-12000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['source_imports'], 1)
        self.assertEqual(report['genuine_zone_subjects'], 10)
        self.assertEqual(report['current_protocol_cases'], 100)
        self.assertEqual(report['runtime_mutations_rejected'], 76)
        self.assertEqual(report['source_declaration_controls'], 10)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
