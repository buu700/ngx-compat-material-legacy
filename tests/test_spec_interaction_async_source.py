# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete accessibility/chips/remaining async fixtures source accounting with finite exceptions."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class InteractionAsyncSourceTests(unittest.TestCase):
    def test_complete_originals_observers_imports_helpers_and_mutations(self):
        # Original snapshot assertions; live contracts run in test_current_inspector_contracts.py.
        result = subprocess.run(['node', 'scripts/run-historical-consumer-probe.mjs', 'spec-interaction-async-source'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        for key, expected in {'complete_original_files': 28, 'complete_original_hunks': 228,
                              'paired_cases': 1082, 'unchanged_complete_callbacks': 886,
                              'changed_callbacks': 196, 'hooks_paired': 138,
                              'fixture_classes_unchanged': 157,
                              'template_style_properties_unchanged': 153,
                              'individual_observer_or_delay_exceptions': 12,
                              'renamed_cases': 0, 'removed_cases': 2, 'predicate_sequences_equal': 1080,
                              'added_cleanup_hooks': 1, 'isolated_chip_iteration_conversions': 1,
                              'individual_provider_hook_exceptions': 1,
                              'global_property_key_spellings': 2,
                              'added_wait_helpers': 9, 'existing_wait_helper_bodies': 6,
                              'owned_product_members': 1141, 'current_owned_case_bodies': 2223,
                              'current_required_historical_case_ids': 2228}.items():
            self.assertEqual(report[key], expected, key)
        self.assertEqual(report['controls'], 109)
        self.assertFalse(report['actual_Angular_native_artifact_or_floor_qualified'])
        self.assertEqual(report['security_clearance'], 'not-passed')
