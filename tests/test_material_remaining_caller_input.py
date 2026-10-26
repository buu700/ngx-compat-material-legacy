# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Real input classes retain their consumed extension and token contracts."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MaterialRemainingCallerInput(unittest.TestCase):
    def test_input_identity_and_receiver_protocols(self):
        result = subprocess.run(
            ['node', 'tests/material_remaining_caller_input_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=120,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['cases'], 14)
        self.assertEqual(report['source_files'], 91)
        self.assertEqual(report['behavior_faults_rejected'], 4)
        self.assertEqual(report['source_closures'], 0)


if __name__ == '__main__':
    unittest.main()
