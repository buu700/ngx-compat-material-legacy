# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Whole chip blur replay with genuine public render/zone hooks and explicit protocols."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ChipBlurRuntimeTests(unittest.TestCase):
    def test_blur_form_state_and_request_lifetimes(self):
        command = ['node', '--max-old-space-size=512', 'tests/chip_blur_runtime_probe.mjs']
        if os.environ.get('CLOSEOUT_CHIP_BLUR_REPORT'):
            command.append(os.environ['CLOSEOUT_CHIP_BLUR_REPORT'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['subjects'], 10)
        self.assertEqual(report['mutation_rejections'], 36)
        self.assertFalse(report['native_executed'])
        self.assertFalse(report['actual_legacy_instances_qualified'])
