# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""A source disposition cannot qualify behavior without current artifact results."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SelectFocusSourceJudgmentTests(unittest.TestCase):
    def test_real_source_proof_and_runtime_corruption_controls(self):
        command = ['node', 'tests/select_focus_click_source_judgment_probe.mjs']
        if os.environ.get('SELECT_FOCUS_SOURCE_DIAGNOSTIC'):
            command.append(os.environ['SELECT_FOCUS_SOURCE_DIAGNOSTIC'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['actual_cli_cases'], 11)
        self.assertEqual(observed['complete_original_hunks'], 4)
        self.assertEqual(observed['minimum_peer_methods_rehashed'], 10)
        self.assertTrue(observed['missing_runtime_rejected'])
        self.assertTrue(observed['complete_synthetic_runtime_fixture_passed'])
        self.assertFalse(observed['actual_product_or_packed_or_native_qualified'])
        self.assertEqual(observed['g11_claim'], 'not-passed')
