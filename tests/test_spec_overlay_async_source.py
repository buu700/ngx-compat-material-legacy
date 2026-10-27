# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Overlay fixture source changes retain strong owned lifecycle/observer contracts."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class OverlayAsyncSourceTests(unittest.TestCase):
    def test_complete_original_cases_hooks_loops_and_observation_changes(self):
        # Original snapshot assertions; live contracts run in test_current_inspector_contracts.py.
        result = subprocess.run(['node', 'scripts/run-historical-consumer-probe.mjs', 'spec-overlay-async-source'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        for key, expected in {'complete_original_files': 6, 'complete_original_hunks': 550,
                              'paired_cases': 667, 'added_cases': 1, 'removed_cases': 1,
                              'exact_label_mappings': 2, 'unchanged_complete_callbacks': 220,
                              'changed_paired_callbacks': 447, 'hooks_paired': 52,
                              'fixture_classes': 108, 'changed_fixture_classes': 4,
                              'template_style_properties': 102, 'changed_private_template_properties': 1,
                              'explicit_nonboundary_exceptions': 4, 'predicate_sequences_equal': 665,
                              'reviewed_loop_conversions': 6, 'reviewed_loop_action_iterations': 27,
                              'owned_product_members': 1141, 'current_owned_case_bodies': 2223,
                              'current_required_historical_case_ids': 2228}.items():
            self.assertEqual(report[key], expected, key)
        self.assertGreaterEqual(report['controls'], 75)
        self.assertFalse(report['actual_Angular_native_artifact_or_floor_qualified'])
        self.assertEqual(report['security_clearance'], 'not-passed')
