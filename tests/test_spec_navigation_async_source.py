# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete sidenav/list/snack-bar/tabs source accounting with finite exceptions."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class NavigationSourceTests(unittest.TestCase):
    def test_complete_originals_observers_imports_helpers_and_mutations(self):
        result = subprocess.run(['node', 'scripts/run-historical-source-inspector.mjs', '--family', 'navigation'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        replay = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertFalse(replay['current_source_qualified'])
        self.assertTrue(replay['historical_subject']['original_probe_source_unchanged'])
        self.assertTrue(replay['historical_subject']['all_selected_members_rehashed'])
        report = replay['historical_report']
        for key, expected in {'complete_original_files': 9, 'complete_original_hunks': 198,
                              'paired_cases': 370, 'unchanged_complete_callbacks': 217,
                              'changed_callbacks': 153, 'hooks_paired': 42,
                              'fixture_classes_unchanged': 84,
                              'template_style_properties_unchanged': 82,
                              'individual_observer_or_delay_exceptions': 7,
                              'renamed_cases': 6, 'removed_cases': 3, 'predicate_sequences_equal': 365,
                              'owned_product_members': 1141, 'current_owned_case_bodies': 2223,
                              'current_required_historical_case_ids': 2228}.items():
            self.assertEqual(report[key], expected, key)
        self.assertEqual(report['controls'], 91)
        self.assertFalse(report['actual_Angular_native_artifact_or_floor_qualified'])
        self.assertEqual(report['security_clearance'], 'not-passed')
