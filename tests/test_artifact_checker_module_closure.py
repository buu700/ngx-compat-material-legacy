# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Scratch-only controls for the synthetic checker module closure."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ArtifactCheckerModuleClosure(unittest.TestCase):
    def test_owned_closure_and_rejections(self):
        result = subprocess.run(['node', 'tests/upstream/artifact-checker-module-closure.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('checker module closure controls passed (fixture only)', result.stdout)
