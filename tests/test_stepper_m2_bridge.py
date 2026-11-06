# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Compile source themes and compare their Stepper colors to the tagged CSS."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class StepperM2BridgeTest(unittest.TestCase):
    def test_tagged_colors_and_shape(self):
        result = subprocess.run(
            ['node', 'tests/stepper_m2_bridge_probe.mjs'], cwd=ROOT,
            capture_output=True, text=True, timeout=90,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

if __name__ == '__main__':
    unittest.main()
