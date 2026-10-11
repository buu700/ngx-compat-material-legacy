# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Genuine public key-manager entrypoints and original/minimum protocol replay."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class KeyManagerBaselineTests(unittest.TestCase):
    def test_original_and_minimum_query_list_routes(self):
        result = subprocess.run(
            ['node', '--experimental-vm-modules', '--max-old-space-size=768',
             'tests/key_manager_baseline_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(len(report['observations']), 3)
        original = report['observations'][0]
        self.assertEqual(original['line'], 'original')
        self.assertEqual(len(original['cases']), 14)
        for observation in report['observations']:
            self.assertEqual(observation['cases'], original['cases'])
            self.assertTrue(observation['query_list_and_array_constructors_outside_DI'])
            self.assertGreater(len(observation['complete_runtime_modules']), 3)
            self.assertEqual(observation['cases']['destroy_unsubscribes_query_and_completes'], 2)
            self.assertTrue(observation['cases']['destroy_cancels_pending_typeahead'])
        self.assertFalse(report['native_execution'])
        self.assertEqual(report['g11_claim'], 'not-passed')
