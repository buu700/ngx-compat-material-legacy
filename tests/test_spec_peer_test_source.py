# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Peer test observation changes cannot establish unexecuted legacy behavior."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SpecPeerTestSourceTests(unittest.TestCase):
    def test_complete_originals_and_owned_public_boundaries(self):
        result = subprocess.run(['node', 'tests/spec_peer_test_source_probe.mjs'], cwd=ROOT,
                                capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['complete_original_files'], 4)
        self.assertEqual(report['complete_original_hunks'], 22)
        self.assertEqual(report['controls'], 35)
        self.assertEqual(report['unchanged_product_members'], 1141)
        self.assertTrue(report['source_membership_exact'])
        self.assertFalse(report['actual_Angular_browser_native_packed_or_floor_qualified'])
