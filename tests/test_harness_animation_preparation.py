# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Source-only current preparation and tagged-origin admission; native gates remain separate."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class HarnessAnimationPreparationTests(unittest.TestCase):
    def test_complete_bodies_and_artifact_mode_imports(self):
        run = subprocess.run(['node', 'tests/harness_animation_preparation_probe.mjs'],
                             cwd=ROOT, capture_output=True, text=True, timeout=60)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        report = json.loads(run.stdout.strip().splitlines()[-1])
        self.assertEqual((report['files'], report['configurations'], report['case_callbacks_unchanged'],
                          report['fixture_classes_unchanged'], report['controls']), (12, 13, 165, 15, 5))
        self.assertFalse(report['actual_browser_native_renderer_or_floor_qualified'])

    def test_current_receipts_and_rejected_qualifications(self):
        run = subprocess.run(['node', 'tests/harness_animation_preparation_qualification_probe.mjs'],
                             cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        report = json.loads(run.stdout.strip().splitlines()[-1])
        self.assertEqual((report['files'], report['configurations'], report['unchanged_case_callbacks'],
                          report['unchanged_fixture_classes'], report['positive_current_entry_bindings'],
                          report['explicit_current_tagged_members'], report['controls']), (12, 13, 165, 15, 32, 3, 37))
        self.assertTrue(report['original_tagged_validator_unchanged'])
        self.assertFalse(report['actual_browser_native_or_floor_qualified'])
        self.assertEqual(report['g11_claim'], 'not-passed')
