# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Source observations remain distinct from scheduler and supported-floor execution."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SpecFormAsyncSourceTests(unittest.TestCase):
    def test_complete_originals_timing_predicates_setup_and_owned_boundaries(self):
        result = subprocess.run(['node', 'tests/spec_form_async_source_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        for key, expected in {'complete_original_files': 4, 'complete_original_hunks': 205,
                              'static_occurrences_paired': 283, 'explicit_input_suite_renames': 2,
                              'unchanged_complete_callbacks': 77, 'exact_predicate_expressions_equal': 280,
                              'individually_changed_predicates': 3, 'setup_hooks_reviewed': 22,
                              'fixture_class_bodies_preserved': 90, 'native_zero_ms_waits': 26,
                              'native_input16ms_waits': 3, 'new_stability_waits': 36,
                              'owned_product_members': 1141, 'current_owned_cases': 2223,
                              'old_owned_cases_preserved': 2222,
                              'production_HTML_CSS_SCSS_or_template_changes': 0}.items():
            self.assertEqual(report[key], expected, key)
        self.assertGreaterEqual(report['controls'], 75)
        self.assertFalse(report['actual_Angular_native_artifact_or_floor_qualified'])
