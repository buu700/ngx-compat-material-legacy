# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Four finite forwardRef source successors."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ForwardRefCurrentSuccessor(unittest.TestCase):
    def test_prior_and_current_source_roles(self):
        result = subprocess.run(['node', 'tests/forward_ref_current_3dd_successor_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual((report['selected'], report['current_uses'], report['callbacks']), (4, 11, 12))
        self.assertEqual(report['semantic_mutations'], 19)
        self.assertTrue(report['prior_roles_identical'])
        self.assertTrue(report['source_only_result'])
