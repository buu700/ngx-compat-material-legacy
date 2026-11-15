# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license in LICENSE.
"""Exact main-only erased position type source review."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AuthoredCdkPositionMainReviewTests(unittest.TestCase):
    def test_source_and_composition_controls(self):
        result = subprocess.run(['node', 'tests/authored_cdk_position_main_review_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-4800:])
        self.assertIn('"rows":7', result.stdout)
