# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact additive native source and unchanged baseline assertions/case identities."""
import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AutocompleteSelectionSpecTests(unittest.TestCase):
    def test_actual_qualifier_and_complete_baseline_ast(self):
        child = subprocess.run(['node', 'tests/autocomplete_selection_spec_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=45)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        result = json.loads(child.stdout)
        self.assertEqual(result['native_case_names_preserved'], 173)
        self.assertEqual(result['extended_cases'], [37, 39, 42, 46])
        self.assertEqual(result['global_case_identities'], 2236)
        self.assertEqual(result['corruption_controls'], 11)
        self.assertEqual(result['source_reader_corruption_controls'], 32)
        self.assertFalse(result['actual_Angular_native_execution'])

    def test_independent_reverse_of_all_five_source_insertions(self):
        child = subprocess.run([sys.executable, 'tests/autocomplete_selection_spec_reverse.py'],
                               cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        result = json.loads(child.stdout)
        self.assertEqual(result['inserted_ranges'], 5)
        self.assertTrue(result['every_original_byte_retained'])
        self.assertEqual(result['full_current_historical_case_count'], 2236)
        self.assertFalse(result['native_or_full_source_admission_qualified'])

    def test_independent_reverse_of_source_reader_code(self):
        child = subprocess.run([sys.executable, 'tests/autocomplete_selection_source_refs.py'],
                               cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        result = json.loads(child.stdout)
        self.assertEqual(result['independently_reversed_code_hooks'], 7)
        self.assertTrue(result['authenticated_git_originals_recovered'])
        self.assertFalse(result['native_or_G11_qualified'])
