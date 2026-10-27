# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete animation-fixture source partitions, callers and rejected mutations."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class AnimationFixtureSourceTests(unittest.TestCase):
    def test_complete_originals_predicates_bindings_and_individual_source_changes(self):
        # Original snapshot assertions; live contracts run in test_current_inspector_contracts.py.
        result = subprocess.run(['node', 'scripts/run-historical-consumer-probe.mjs', 'spec-animation-fixture-source'],
                                cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        for key, expected in {'schema_version': 1, 'complete_original_files': 61, 'complete_original_bodies': 122, 'complete_original_hunks': 178, 'paired_cases': 2383, 'unchanged_complete_callbacks': 2352, 'changed_callbacks': 31, 'renamed_cases': 1, 'fixture_setup_projection_equal_cases': 2365, 'individual_callback_source_exceptions': 18, 'hooks_before': 283, 'hooks_after': 279, 'hooks_paired': 279, 'removed_hooks': 4, 'individual_hook_source_exceptions': 1, 'fixture_classes_unchanged': 439, 'template_style_properties_unchanged': 427, 'removed_bindings': 61, 'added_bindings': 29, 'private_helper_pairs': 5, 'retained_NoopAnimationsModule_exception_calls': 8, 'relocated_chip_variable_declarations': 4, 'owned_product_members': 1141, 'current_owned_case_bodies': 2223, 'current_required_historical_case_ids': 2228, 'required_consumer_CSS_SCSS_changes': 0, 'controls': 125}.items():
            self.assertEqual(report[key], expected, key)
        self.assertFalse(report['actual_Angular_native_artifact_or_floor_qualified'])
        self.assertEqual(report['security_clearance'], 'not-passed')
        self.assertEqual(report['g11_claim'], 'not-passed')
