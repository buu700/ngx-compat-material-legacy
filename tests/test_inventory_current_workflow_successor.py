# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact current CI workflow successor and source-only controls."""
import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class InventoryCurrentWorkflowSuccessorTest(unittest.TestCase):
    def test_current_workflow_source_controls(self):
        done = subprocess.run(['node', 'tests/inventory_current_workflow_successor_probe.mjs'],
                              cwd=ROOT, text=True, capture_output=True, check=True)
        result = json.loads(done.stdout)
        self.assertEqual(result['workflow_current']['path'], '.github/workflows/ci.yml')
        self.assertEqual([(x['cases'], x['mutants_rejected']) for x in result['source_regressions']],
                         [(30, 7), (20, 6)])
        self.assertTrue(result['unknown_sha_rejected'])
        self.assertTrue(result['late_physical_and_callback_mutations_rejected'])
        self.assertTrue(result['loaded_image_and_packet_mutations_rejected'])
        self.assertTrue(result['helper_test_transition_qualified'])
        self.assertTrue(result['helper_test_late_physical_and_callback_mutations_rejected'])
        self.assertFalse(result['full_Actions_execution_qualified'])


if __name__ == '__main__':
    unittest.main()
