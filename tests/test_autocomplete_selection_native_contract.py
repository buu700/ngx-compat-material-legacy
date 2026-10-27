# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Three original patches retain independent mandatory named native contracts."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AutocompleteSelectionNativeContractTests(unittest.TestCase):
    def test_proposed_registry_preserves_and_requires_the_complete_native_run(self):
        child = subprocess.run(['node', 'tests/autocomplete_selection_native_contract_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        result = json.loads(child.stdout.strip().splitlines()[-1])
        self.assertEqual(result['prior_scopes_preserved'], 11)
        self.assertEqual(result['individual_subjects'], 3)
        self.assertEqual(result['named_case_occurrences'], 9)
        self.assertEqual(result['unique_named_cases'], 6)
        self.assertEqual(result['full_historical_cases'], 2236)
        self.assertEqual(result['synthetic_rejections'], 72)
        self.assertFalse(result['actual_browser_artifact_or_floor_executed'])
