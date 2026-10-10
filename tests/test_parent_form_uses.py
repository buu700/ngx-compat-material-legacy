# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Genuine public parent-form construction, lookup, submission and historical helpers."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ParentFormUseTests(unittest.TestCase):
    def test_parent_form_tokens_and_submitted_transitions(self):
        command = ['node', '--max-old-space-size=512', 'tests/parent_form_use_probe.mjs']
        if os.environ.get('CLOSEOUT_PARENT_FORM_REPORT'):
            command.extend(['--report', os.environ['CLOSEOUT_PARENT_FORM_REPORT']])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['frozen_uses'], 48)
        self.assertEqual(report['type_references'], 52)
        self.assertEqual(report['decorated_optional_constructors'], 4)
        self.assertEqual(report['controls_per_subject'], 5)
        self.assertEqual(report['mixin_transition_observations_per_subject'], 299)
        self.assertEqual(report['mutations'], 10)
        self.assertFalse(report['native_executed'])
