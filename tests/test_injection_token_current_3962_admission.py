# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite InjectionToken source records and authentic transitions."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class InjectionTokenCurrentAdmission(unittest.TestCase):
    def test_source_admission_and_transitions(self):
        result = subprocess.run(['node', 'tests/injection_token_current_3962_admission_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual((report['selected'], report['source_transitions'], report['owned_tokens']), (2, 2, 27))
        self.assertTrue(report['original_shared_token'])
        self.assertTrue(report['distinct_animation_token'])
        self.assertTrue(report['source_only_result'])
