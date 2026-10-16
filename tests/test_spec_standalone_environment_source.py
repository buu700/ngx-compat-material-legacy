# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Standalone source conclusions preserve product fixtures; runtime remains pending."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SpecStandaloneEnvironmentSourceTests(unittest.TestCase):
    def test_originals_predicates_templates_lifecycle_witness_and_owned_boundaries(self):
        result = subprocess.run(['node', 'tests/spec_standalone_environment_source_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['complete_original_files'], 17)
        self.assertEqual(report['complete_original_hunks'], 675)
        self.assertEqual(report['static_occurrences_paired'], 1311)
        self.assertEqual(report['disabled_occurrences_preserved'], 1)
        self.assertEqual(report['individually_reviewed_destroy_witnesses'], 1)
        self.assertEqual(report['changed_template_properties_reviewed'], 11)
        self.assertEqual(report['changed_style_properties'], 0)
        self.assertGreaterEqual(report['controls'], 48)
        self.assertEqual(report['unchanged_product_members'], 1141)
        self.assertEqual(report['owned_packed_menu_runtime_qualification'], 'pending')
        self.assertFalse(report['actual_Angular_browser_native_packed_or_floor_qualified'])
