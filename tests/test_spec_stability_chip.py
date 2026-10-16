# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""The owned empty-query reset must clear stale items without changing sibling focus."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SpecStabilityChipTests(unittest.TestCase):
    def test_actual_owned_method_public_query_key_manager_and_exact_source_delta(self):
        result = subprocess.run(['node', 'tests/spec_stability_chip_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['controls'], 12)
        self.assertEqual(report['actual_owned_method_protocol_cases'], 5)
        self.assertEqual(report['authentic_before_method_rejected'], 2)
        self.assertEqual(report['unexpected_change_event_mutants_rejected'], 2)
        self.assertEqual(report['preserved_cases'], 2222)
        self.assertEqual(report['current_cases'], 2223)
        self.assertEqual(report['unchanged_product_members'], 1139)
        self.assertFalse(report['runtime']['canonical_or_floor_qualified'])
        self.assertFalse(report['actual_Angular_DOM_artifact_or_floor_qualified'])
