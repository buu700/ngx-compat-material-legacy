# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete datepicker/tooltip/slider source accounting with finite exceptions."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DateTooltipSliderSourceTests(unittest.TestCase):
    def test_complete_originals_observers_imports_helpers_and_mutations(self):
        result = subprocess.run(['node', 'tests/spec_date_tooltip_slider_source_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        for key, expected in {'complete_original_files': 7, 'complete_original_hunks': 239,
                              'paired_cases': 413, 'unchanged_complete_callbacks': 177,
                              'changed_callbacks': 236, 'hooks_paired': 67,
                              'fixture_classes_unchanged': 74,
                              'template_style_properties_unchanged': 98,
                              'individual_observer_or_delay_exceptions': 8,
                              'promoted_fixture_bindings': 2, 'predicate_sequences_equal': 411,
                              'owned_product_members': 1141, 'current_owned_case_bodies': 2223,
                              'current_required_historical_case_ids': 2228}.items():
            self.assertEqual(report[key], expected, key)
        self.assertGreaterEqual(report['controls'], 70)
        self.assertFalse(report['actual_Angular_native_artifact_or_floor_qualified'])
        self.assertEqual(report['security_clearance'], 'not-passed')
