# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete CDK layout/table/scrolling/overlay source accounting with finite exceptions."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CdkAsyncSourceTests(unittest.TestCase):
    def test_complete_originals_observers_imports_helpers_and_mutations(self):
        # Original snapshot assertions; live contracts run in test_current_inspector_contracts.py.
        result = subprocess.run(['node', 'scripts/run-historical-consumer-probe.mjs', 'spec-cdk-async-source'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        for key, expected in {'complete_original_files': 11, 'complete_original_hunks': 110,
                              'paired_cases': 406, 'unchanged_complete_callbacks': 287,
                              'changed_callbacks': 119, 'hooks_paired': 50,
                              'fixture_classes_unchanged': 65,
                              'template_style_properties_unchanged': 68,
                              'individual_observer_or_delay_exceptions': 4,
                              'renamed_cases': 1, 'removed_cases': 3, 'predicate_sequences_equal': 403,
                              'initialization_scroll_helper_bodies': 12, 'added_debounce_constants': 1,
                              'local_scheduler_flush_source_statements': 2,
                              'local_async_result_type_wrappers': 1,
                              'owned_product_members': 1141, 'current_owned_case_bodies': 2223,
                              'current_required_historical_case_ids': 2228}.items():
            self.assertEqual(report[key], expected, key)
        self.assertEqual(report['controls'], 99)
        self.assertFalse(report['actual_Angular_native_artifact_or_floor_qualified'])
        self.assertEqual(report['security_clearance'], 'not-passed')
