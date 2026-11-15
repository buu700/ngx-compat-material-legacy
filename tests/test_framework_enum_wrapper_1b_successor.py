# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite framework enum evidence successor after class wrapper routing."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FrameworkEnumWrapperSuccessor(unittest.TestCase):
    def test_exact_prior_and_current_source_review(self):
        result = subprocess.run(['node', 'tests/framework_enum_wrapper_1b_successor_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual((report['selected'], report['prior_wrapper_only_stale']), (34, 34))
        self.assertEqual((report['enum_uses'], report['semantic_mutations']), (76, 26))
        self.assertTrue(report['structural_output_only'])
        self.assertTrue(report['semantic_review_required'])
