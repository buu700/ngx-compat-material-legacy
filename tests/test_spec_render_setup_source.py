# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""A private render/focus test rewrite is not evidence of retained product compatibility."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SpecRenderSetupSourceTests(unittest.TestCase):
    def test_complete_originals_owned_observations_and_peer_sources(self):
        result = subprocess.run(['node', 'scripts/run-historical-source-probe.mjs', 'render-setup-source'], cwd=ROOT,
                                capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-8000:])
        report = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['complete_original_files'], 7)
        self.assertEqual(report['complete_original_hunks'], 19)
        self.assertEqual(report['controls'], 48)
        self.assertEqual(report['unchanged_product_members'], 1141)
        self.assertTrue(report['source_membership_exact'])
        self.assertFalse(report['actual_Angular_browser_native_packed_or_floor_qualified'])
