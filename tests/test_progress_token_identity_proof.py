# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Tagged progress token identity and explicit public Injector protocols."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ProgressTokenIdentityProof(unittest.TestCase):
    def test_original_alias_current_identity_and_default_branches(self):
        result = subprocess.run(['node', 'tests/progress_token_identity_proof.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual((report['tag'], report['minimum']), ('16.2.14', '22.1.7'))
        self.assertTrue(report['shared'])
        self.assertEqual((report['distinct_tokens'], report['defaults_branches'], report['mutations']), (6, 3, 8))
        self.assertFalse(report['native_executed'])
