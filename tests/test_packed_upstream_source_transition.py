# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Independent token patch observations preserve the full upstream ledger."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PackedUpstreamSourceTransitionTests(unittest.TestCase):
    def test_proposed_metadata_patch_preserves_unrelated_bytes_and_judgments(self):
        result = subprocess.run(['node', 'tests/packed_upstream_source_transition_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['proposed_entries'], 85)
        self.assertEqual(report['changed_scalar_tokens'], 179)
        self.assertEqual(len(report['rejected']), 3)
        self.assertTrue(report['independent_Node_Python_after_bytes_equal'])
        self.assertTrue(report['canonical_state_is_exact_before_or_after'])
