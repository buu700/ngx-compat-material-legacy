# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Stability-source decisions retain owned observations and runtime obligations."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SpecStabilitySourceTests(unittest.TestCase):
    def test_complete_originals_observers_fixtures_and_repaired_owned_context(self):
        # Original snapshot assertions; live contracts run in test_current_inspector_contracts.py.
        result = subprocess.run(['node', 'scripts/run-historical-consumer-probe.mjs', 'spec-stability-source'],
                                cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['complete_original_files'], 7)
        self.assertEqual(report['complete_original_hunks'], 42)
        self.assertEqual(report['paired_static_occurrences'], 575)
        self.assertEqual(report['removed_registrations'], 1)
        self.assertEqual(report['added_registrations'], 1)
        self.assertEqual(report['unchanged_callbacks'], 545)
        self.assertEqual(report['changed_callbacks_reviewed'], 30)
        self.assertEqual(report['wait_duration_changes'], 28)
        self.assertEqual(report['noncase_programs_reviewed'], 7)
        self.assertEqual(report['private_fixture_or_helper_changes'], 3)
        self.assertGreaterEqual(report['controls'], 70)
        self.assertEqual(report['owned_product_members'], 1141)
        self.assertEqual(report['old_owned_cases_preserved'], 2222)
        self.assertEqual(report['current_owned_cases'], 2223)
        self.assertEqual(report['production_HTML_CSS_SCSS_or_template_changes'], 0)
        self.assertFalse(report['new_Angular_case_executed'])
        self.assertFalse(report['actual_Angular_native_artifact_or_floor_qualified'])
