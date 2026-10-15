# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite public literal domains and exact authored type erasure."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PublicLiteralTypesTests(unittest.TestCase):
    def test_domains_erasure_and_historical_aliases_reject_scope_changes(self):
        result = subprocess.run(['node', 'tests/public_literal_types_probe.mjs'],
            cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        for field, expected in [('aliases', 11), ('alias_subjects', 33), ('frozen_uses', 10),
                ('current_uses', 11), ('files', 16), ('strict_positive_assignments', 108),
                ('strict_negative_assignments', 195), ('bidirectional_assignments', 44),
                ('strict_equalities', 22), ('historical_public_aliases', 9), ('negative_controls', 23)]:
            self.assertEqual(observed[field], expected, field)
        self.assertTrue(observed['import_alias_positive'])
        self.assertFalse(observed['complete_component_or_barrel_or_native_or_packed_qualified'])
