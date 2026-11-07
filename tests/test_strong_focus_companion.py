# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Keep historical focus output ordered before the public current companion."""
from pathlib import Path
import subprocess
import unittest


class StrongFocusCompanionTests(unittest.TestCase):
    def test_historical_and_current_focus_output(self):
        root = Path(__file__).resolve().parents[1]
        result = subprocess.run(
            ['node', 'tests/strong_focus_companion_probe.mjs'],
            cwd=root, check=True, capture_output=True, text=True, timeout=60,
        )
        self.assertIn('7 configurations preserved', result.stdout)
