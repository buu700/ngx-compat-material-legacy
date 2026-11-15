# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license in LICENSE.
"""Main-only finite pure CDK review must retain authenticated source provenance."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AuthoredCdkPureMainReviewTests(unittest.TestCase):
    def test_producer_and_mutation_controls(self):
        result = subprocess.run(
            ['node', 'tests/authored_cdk_pure_main_review_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=90,
        )
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-4800:])
        self.assertIn('"rows":70', result.stdout)
