# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Source inventory successors preserve original judgments and actual-run gates."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TabAdapterProductInventory(unittest.TestCase):
    def test_source_preservation_and_fail_closed_current_and_history_reads(self):
        command = ['node', 'tests/tab_adapter_product_inventory_probe.mjs']
        if os.environ.get('NGX_TAB_INVENTORY_DIAGNOSTIC'):
            command.append(os.environ['NGX_TAB_INVENTORY_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=240)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-14000:])
        result = json.loads(child.stdout)
        self.assertEqual(result['source_scoped_SHA_reviews_requalified'], 75)
        self.assertEqual(result['individual_original_judgments_preserved'], 75)
        self.assertEqual(result['unselected_SHA_row_bytes_preserved'], 1622)
        self.assertEqual(result['authored_evidence_bindings_requalified'], 1)
        self.assertEqual(result['authored_source_insufficient'], 0)
        self.assertTrue(result['late_mutation_rejected'])
        self.assertGreater(result['rejection_controls'], 25)
        self.assertTrue(all(row['result'] == {'ok': False, 'detail': 'missing coordinator run'}
                            for row in result['raw_native_profiles']))
        self.assertEqual(result['new_semantic_closures'], 0)
        self.assertFalse(result['actual_native_packed_or_floor_qualified'])


if __name__ == '__main__':
    unittest.main()
