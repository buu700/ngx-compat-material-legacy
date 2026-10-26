# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite current source judgments preserve all original authored obligations."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PackedCvaSourceRequalification(unittest.TestCase):
    def test_current_roles_and_exact_metadata_successor(self):
        child = subprocess.run(['node', 'tests/packed_cva_source_requalification_probe.mjs'],
                               cwd=ROOT, capture_output=True, text=True, timeout=240)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-14000:])
        report = json.loads(child.stdout)
        self.assertTrue(report['passed'])
        self.assertEqual(report['existing_source_roles_requalified'], 241)
        self.assertEqual(report['changed_source_roles'], 68)
        self.assertEqual(report['new_accessor_source_roles'], 6)
        self.assertEqual(report['original_complete_cases_and_decisions_preserved'], 241)
        self.assertEqual(report['unselected_rows_preserved'], 1804)
        self.assertGreaterEqual(report['negative_controls'], 30)
        self.assertTrue(report['source_snapshot_valid'])
        self.assertFalse(report['current_coordinator_native_or_floor_qualified'])
        self.assertEqual(report['g11_claim'], 'not-passed')


if __name__ == '__main__':
    unittest.main()
