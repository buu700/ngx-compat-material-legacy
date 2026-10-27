# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Review scope rejects pending/source markers and permits complete fixture input."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class IndividualEvidenceScopeTests(unittest.TestCase):
    def test_real_cli_controls_and_complete_positive_fixtures(self):
        result = subprocess.run(['node', 'tests/upstream_individual_evidence_scope_probe.mjs'],
            cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        for field, expected in [('helper_positives', 17), ('helper_negatives', 303),
                ('actual_CLI_cases', 12), ('checker_mutants_detected', 2),
                ('frozen_fixture_uses', 1736), ('current_fixture_additional_uses', 8),
                ('synthetic_current_fixture_uses', 1), ('authenticated_panel_fixture_uses', 7)]:
            self.assertEqual(observed[field], expected, field)
        self.assertTrue(observed['complete_positive_behavior_fixture'])
        self.assertTrue(observed['complete_positive_source_applicability_fixture'])
        self.assertFalse(observed['actual_product_or_packed_or_native_qualified'])
        self.assertEqual(observed['g11_claim'], 'not-passed')
