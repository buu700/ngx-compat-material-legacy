# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exercise keyboard observation and tooltip fixture precondition controls."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class BrowserKeycodeContractTests(unittest.TestCase):
    def test_observation_and_room_mutations(self):
        result = subprocess.run(['node', 'tests/browser-keycode-contract-controls.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('browser keycode positive and mutation controls passed', result.stdout)
        self.assertIn('tooltip below/center room controls passed', result.stdout)
