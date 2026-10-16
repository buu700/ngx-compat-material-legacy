# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite generated-ID subjects need the complete actual packed observation."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class GeneratedIdentityAdmissionTests(unittest.TestCase):
    def test_actual_reader_semantics_cli_and_source_controls(self):
        command = ['node', 'tests/upstream/identity-artifact-admission.mjs']
        if os.environ.get('IDENTITY_ADMISSION_DIAGNOSTIC'):
            command.append(os.environ['IDENTITY_ADMISSION_DIAGNOSTIC'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-10000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['subjects'], 3)
        self.assertEqual(report['full_packed_roster'], 106)
        self.assertGreaterEqual(report['cached_actual_reader_semantic_controls'], 1174)
        self.assertEqual(report['actual_CLI_controls'], 24)
        self.assertEqual(report['source_corruptions_rejected'], 9)
        self.assertFalse(report['actual_packed_native_or_floor_qualified'])
