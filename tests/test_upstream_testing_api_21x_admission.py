# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Seven individual protocol/source proofs; root CLI controls have a separate probe."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class UpstreamTestingApi21xAdmissionTests(unittest.TestCase):
    def test_individual_source_and_fresh_inherited_protocol_guards(self):
        result = subprocess.run(['node', 'tests/upstream_testing_api_21x_admission_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['individual_reviews'], 7)
        self.assertEqual(report['original_hunks'], 76)
        self.assertEqual(len(report['cases']), 8)
        self.assertEqual(len(report['rejected']), 16)
        self.assertEqual(report['fresh_inherited_cases'], 55)
        self.assertIsInstance(report['canonical_applied'], bool)
