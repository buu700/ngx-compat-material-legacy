# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Public detector source/type/component lead; native legacy callers remain pending."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ChangeDetectorUseTests(unittest.TestCase):
    def test_public_source_binding_and_onpush_component(self):
        command = ['node', '--max-old-space-size=512', 'tests/change_detector_use_probe.mjs']
        if os.environ.get('CLOSEOUT_CHANGE_DETECTOR_REPORT'):
            command.append(os.environ['CLOSEOUT_CHANGE_DETECTOR_REPORT'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['frozen_uses'], 38)
        self.assertEqual(report['supplementary_uses'], 4)
        self.assertEqual(report['bound_calls'], 94)
        self.assertEqual(report['runtime_subjects'], 6)
        self.assertEqual(report['states_per_subject'], 7)
        self.assertEqual(report['source_mutations'], 8)
        self.assertEqual(report['runtime_mutations'], 8)
        self.assertTrue(report['unrelated_same_name_receiver_excluded'])
        self.assertFalse(report['actual_legacy_native_or_scheduler_qualified'])
