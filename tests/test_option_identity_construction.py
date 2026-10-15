# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Whole owned/tagged/current constructor identity and pre-repair controls."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class OptionIdentityConstructionTests(unittest.TestCase):
    def test_namespaces_and_independent_pre_repair_controls(self):
        result = subprocess.run(['node', 'tests/option_identity_construction_probe.mjs'],
            cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        for field, expected in [('contexts', 18), ('source_requalification_negatives', 7),
                ('owned_modules', 12), ('option_collisions', 8), ('optgroup_label_collisions', 8)]:
            self.assertEqual(observed[field], expected, field)
        self.assertEqual(observed['stage'], 'after')
        self.assertFalse(observed['actual_angular_nodes_or_native_or_packed_qualified'])
