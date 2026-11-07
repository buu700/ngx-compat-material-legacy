# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite C04 source evidence and unconditional checker routing."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class C04FirstIndividualTests(unittest.TestCase):
    def test_pinned_evidence_and_checker_route(self):
        subprocess.run(['node', 'tests/c04_first_individual_probe.mjs'], cwd=ROOT, check=True)
