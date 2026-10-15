# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Genuine constructor identities and the internal panel's structural type."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RemainingIdentityConstructionTests(unittest.TestCase):
    def test_namespaces_and_type_ownership(self):
        result = subprocess.run(['node', 'tests/remaining_identity_construction_probe.mjs'],
            cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        for field, expected in [('contexts', 50), ('current_positive_contexts', 24),
                ('individual_reversion_contexts', 14), ('tagged_reference_contexts', 12),
                ('tagged_reference_tab_panel_collision_contexts', 2),
                ('source_requalification_negatives', 13), ('type_ownership_negative_controls', 4),
                ('owned_modules', 95), ('owned_resources', 22)]:
            self.assertEqual(observed[field], expected, field)
        self.assertTrue(observed['public_export_names_unchanged'])
        self.assertFalse(observed['actual_owned_nodes_or_native_or_packed_qualified'])
