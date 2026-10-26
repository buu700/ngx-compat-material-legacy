# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact current SDKs check the complete owned graph and public consumer types."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MaterialRemainingCallerTypes(unittest.TestCase):
    def test_owned_graph_and_public_typed_contracts(self):
        result = subprocess.run(['node', 'tests/material_remaining_caller_type_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['owned_sources'], 91)
        self.assertEqual(report['diagnostics'], 0)
        self.assertEqual(report['negative_type_controls'], 10)
        self.assertEqual(report['public_input_extension_points'], 3)
        self.assertTrue(report['public_placeholder_contract_checked'])
        self.assertEqual(report['source_closures'], 0)


if __name__ == '__main__':
    unittest.main()
