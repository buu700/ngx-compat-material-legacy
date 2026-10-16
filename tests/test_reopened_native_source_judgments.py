# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Real individual source decisions still require the named native artifact run."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ReopenedNativeSourceJudgmentTests(unittest.TestCase):
    def test_complete_source_judgments_and_real_cli_runtime_rejection(self):
        result = subprocess.run(['node', 'tests/upstream/reopened-native-source-judgments.mjs'],
                                cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-10000:])
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['source_judgments'], 3)
        self.assertEqual(observed['whole_original_hunks_reviewed'], 14)
        self.assertTrue(observed['exact_preceding_ledger_recovered'])
        self.assertEqual(observed['actual_CLI_controls'], 18)
        self.assertFalse(observed['actual_browser_native_packed_or_floor_qualified'])
        self.assertEqual(observed['real_runtime_or_authored_use_closures'], 0)
