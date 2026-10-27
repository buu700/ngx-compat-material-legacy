# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Whole patched methods reproduce original defects and reject corruptions."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AutocompleteSelectionStateTests(unittest.TestCase):
    def test_actual_sources_and_selection_lifecycle_corruptions(self):
        result = subprocess.run(['node', 'tests/autocomplete_selection_state_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-6000:])
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['cases_per_source'], 14)
        self.assertEqual(observed['minimum_peers'], 2)
        self.assertEqual(observed['original_source_versions'], 6)
        self.assertEqual(observed['mutants_rejected'], 9)
        self.assertFalse(observed['actual_native_artifact_or_floor_executed'])
