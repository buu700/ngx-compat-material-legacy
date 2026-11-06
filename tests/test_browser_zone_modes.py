# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Verify runtime mode bindings and reject mismatched observations."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class BrowserZoneModesTests(unittest.TestCase):
    def test_mode_bindings_and_negative_observations(self):
        result=subprocess.run(['node','tests/browser_zone_modes_probe.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=45)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
