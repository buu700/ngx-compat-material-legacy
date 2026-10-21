# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Overlay preparation retains all canonical and packed/native obligations."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class OverlayCallerPreparation(unittest.TestCase):
    def test_bounded_public_evidence_and_corruption_controls(self):
        command = ['node', 'tests/overlay_caller_roles_probe.mjs']
        if os.environ.get('NGX_OVERLAY_CALLER_DIAGNOSTIC'):
            command.append(os.environ['NGX_OVERLAY_CALLER_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT,
                               capture_output=True, text=True, timeout=60)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-6000:])
        result = json.loads(child.stdout)
        self.assertEqual(result['routes'], 48)
        self.assertEqual(result['tooltip_current_routes'], 8)
        self.assertEqual(result['public_type_models'], 3)
        self.assertEqual(result['negative_type_controls'], 9)
        self.assertEqual(result['complete_factories'], 5)
        self.assertEqual(result['genuine_runtime_contexts'], 10)
        self.assertEqual(result['bounded_runtime_cases'], 160)
        self.assertEqual(result['runtime_source_mutants_rejected'], 6)
        self.assertGreaterEqual(result['evidence_corruptions_rejected'], 15)
        self.assertEqual(result['late_changes_rejected'], 2)
        self.assertTrue(result['canonical_ledgers_preserved'])
        self.assertEqual(result['canonical_source_closures_integrated'], 0)
        self.assertFalse(result['actual_native_packed_AOT_or_full_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
