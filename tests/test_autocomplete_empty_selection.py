# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Required selection survives closing an attached empty autocomplete panel."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class EmptySelectionTests(unittest.TestCase):
    def test_complete_source_methods(self):
        result = subprocess.run(
            ['node', 'tests/autocomplete_empty_selection_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=20,
        )
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-6000:])

    def test_real_admission_requires_complete_artifact_run(self):
        result = subprocess.run(
            ['node', 'tests/upstream/autocomplete-empty-selection-admission.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=45,
        )
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-6000:])
