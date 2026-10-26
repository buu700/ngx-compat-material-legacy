# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""The selected exports resolve to the genuine tagged/current SDK declarations."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MaterialRemainingCallerSDK(unittest.TestCase):
    def test_authentic_namespaces_and_original_token_alias(self):
        result = subprocess.run(['node', 'tests/material_remaining_caller_sdk_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['SDK_worlds'], 3)
        self.assertEqual(report['public_exports'], 21)
        self.assertEqual(report['stable_current'], 14)
        self.assertTrue(report['original_legacy_token_declaration_alias_identity'])
        self.assertEqual(report['corruptions_rejected'], 2)
        self.assertEqual(report['source_closures'], 0)


if __name__ == '__main__':
    unittest.main()
