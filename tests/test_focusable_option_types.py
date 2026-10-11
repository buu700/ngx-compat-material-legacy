# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact public option type closure and legacy caller import erasure."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FocusableOptionTypeTests(unittest.TestCase):
    def test_public_closure_and_exact_erased_callers(self):
        result = subprocess.run(
            ['node', '--max-old-space-size=768', 'tests/focusable_option_type_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(len(report['cases']), 8)
        self.assertEqual(report['frozen_uses'], 7)
        self.assertEqual(report['current_delta_uses'], 1)
        roles = [row['references'][0]['role'] for row in report['cases']]
        self.assertEqual(roles.count('erased-implements'), 7)
        self.assertEqual(roles.count('erased-type-reference'), 1)
        for row in report['cases']:
            self.assertEqual(row['emitted_js_sha256'], row['emitted_js_without_import_sha256'])
        types = report['type_compilation']
        self.assertTrue(types['strict'])
        self.assertFalse(types['skip_lib_check'])
        self.assertEqual(types['exact_structural_equalities'], 6)
        self.assertEqual(types['assignment_directions'], 12)
        self.assertEqual(types['negative_controls'], 21)
        self.assertEqual(len(report['mutation_rejections']), 15)
        self.assertEqual(report['g11_claim'], 'not-passed')
