# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""The existing packed comparator case needs real identity/event/node detail."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SelectionComparatorPackedTests(unittest.TestCase):
    def test_actual_collector_writer_and_fixture_controls(self):
        result = subprocess.run(['node', 'tests/selection_comparator_packed_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertGreaterEqual(observed['semantic_and_actual_collector_defects_rejected'], 130)
        self.assertEqual(observed['collector_mutants_detected'], 3)
        self.assertEqual(observed['actual_writer_cases'], 5)
        self.assertEqual(observed['source_scope_mutants_detected'], 10)
        self.assertFalse(observed['actual_packed_native_or_floor_execution'])

    def test_untouched_tagged_receiver_with_genuine_peer_models(self):
        result = subprocess.run(['node', 'tests/selection_comparator_tagged_protocol.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed['subjects'], 8)
        self.assertEqual(observed['generated_observer_positive_protocols'], 6)
        self.assertEqual(observed['original_bug_protocols'], 2)
        self.assertEqual(observed['mutations_rejected'], 4)
        self.assertEqual(observed['tagged_event_counts'], [0, 2, 2, 2, 5, 5, 7, 9])
        self.assertFalse(observed['actual_packed_native_or_floor_qualified'])
