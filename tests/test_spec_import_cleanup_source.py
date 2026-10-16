# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete import/setup originals and file-scoped rejected mutations."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class ImportCleanupSourceTests(unittest.TestCase):
    def test_complete_originals_bindings_scaffolding_and_retained_programs(self):
        result = subprocess.run(['node', 'tests/spec_import_cleanup_source_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        for key, expected in {'schema_version': 1, 'complete_original_files': 62, 'complete_original_bodies': 124, 'complete_original_hunks': 188, 'paired_cases': 1649, 'unchanged_complete_callbacks': 1646, 'changed_callbacks': 3, 'hooks_before': 256, 'hooks_after': 230, 'retained_template_style_properties': 226, 'removed_bindings': 33, 'added_bindings': 1, 'removed_private_fixture_classes': 1, 'local_helper_signature_changes': 2, 'owned_product_members': 1141, 'current_owned_case_bodies': 2223, 'current_required_historical_case_ids': 2228, 'required_consumer_CSS_SCSS_changes': 0, 'controls': 97}.items():
            self.assertEqual(report[key], expected, key)
        self.assertEqual(len(report['normalization_categories']), 12)
        self.assertFalse(report['actual_Angular_native_artifact_or_floor_qualified'])
        self.assertEqual(report['security_clearance'], 'not-passed')
        self.assertEqual(report['g11_claim'], 'not-passed')
