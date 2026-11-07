# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Synthetic current MAIN roster writer and validator controls."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class HistoricalMainEpochTests(unittest.TestCase):
    def test_current_epoch_and_archived_scopes(self):
        result = subprocess.run(['node', 'tests/upstream/historical-main-epoch-admission.mjs'],
                                cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-10000:])
        self.assertEqual(json.loads(result.stdout.strip().splitlines()[-1]),
                         {'subjects': 6, 'negative_controls': 66, 'fixture_only': True})
