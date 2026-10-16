# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Source observations preserve reachable public peers without runtime/security credit."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SpecSurfaceAsyncSourceTests(unittest.TestCase):
    def test_complete_originals_helper_predicates_timing_and_owned_contracts(self):
        result = subprocess.run(['node', 'tests/spec_surface_async_source_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        for key, expected in {'complete_original_files': 4, 'complete_original_hunks': 71,
                              'static_occurrences_paired': 188, 'unchanged_complete_callbacks': 147,
                              'exact_predicate_expressions_equal': 188, 'setup_hooks_reviewed': 15,
                              'changed_hook_wrappers': 7, 'fixture_class_bodies_preserved': 47,
                              'individually_recorded250_to300ms_waits': 5, 'new_stability_waits': 6,
                              'unchanged_icon_trust_cases': 3, 'owned_product_members': 1141,
                              'current_owned_cases_preserved': 2223,
                              'production_HTML_CSS_SCSS_or_template_changes': 0}.items():
            self.assertEqual(report[key], expected, key)
        self.assertGreaterEqual(report['controls'], 85)
        self.assertFalse(report['actual_Angular_native_artifact_or_floor_qualified'])
        self.assertEqual(report['security_clearance'], 'not-passed')
