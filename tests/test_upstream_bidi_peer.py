# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Public bidi source conclusions need actual full packed artifact evidence."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PublicBidiAdmissionTests(unittest.TestCase):
    def test_real_reader_cli_and_source_controls(self):
        result = subprocess.run(['node', 'tests/upstream/bidi-peer-admission.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-12000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['finite_subjects'], 2)
        self.assertEqual(report['full_packed_roster'], 106)
        self.assertGreaterEqual(report['actual_helper_controls'], 40)
        self.assertGreaterEqual(report['cached_actual_body_semantic_controls'], 160)
        self.assertEqual(report['actual_CLI_controls'], 16)
        self.assertEqual(report['source_corruptions_rejected'], 11)
        self.assertFalse(report['actual_packed_native_or_floor_qualified'])
