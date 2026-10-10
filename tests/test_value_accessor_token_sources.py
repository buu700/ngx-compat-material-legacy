# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Actual historical provider source; actual control construction remains separate."""
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]


class ValueAccessorTokenSourceTests(unittest.TestCase):
    def test_exact_source_provider_targets_and_attachments(self):
        command = ['node', '--max-old-space-size=512', 'tests/value_accessor_token_source_probe.mjs']
        if os.environ.get('CLOSEOUT_VALUE_ACCESSOR_SOURCE_REPORT'):
            command.append(os.environ['CLOSEOUT_VALUE_ACCESSOR_SOURCE_REPORT'])
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['actual_class_symbols'], 6)
        self.assertEqual(report['actual_decorator_attachments'], 6)
        self.assertEqual(report['public_exports'], 6)
        self.assertEqual(report['mutations'], 7)
        self.assertFalse(report['actual_class_instances_or_native_cva_executed'])
