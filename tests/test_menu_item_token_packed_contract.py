# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Nested item token/query observations must come from actual packed Angular nodes."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MenuItemTokenPackedContractTests(unittest.TestCase):
    def test_actual_collector_writer_and_preserved_source_preimages(self):
        result = subprocess.run(['node', 'tests/menu_item_token_packed_contract_probe.mjs'],
            cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        for field, expected in [('derived_cases', 106), ('retained_previous_cases', 105),
                ('negative_cases', 830), ('collector_mutants', 3), ('writer_cases', 3),
                ('source_reversal_negative_controls', 67)]:
            self.assertEqual(observed[field], expected, field)
        self.assertTrue(observed['roster_bound'])
        self.assertFalse(observed['actual_packed_menu_or_components_executed'])
        self.assertFalse(observed['native_browser_executed'])

    def test_three_live_token_uses_remain_pending(self):
        frozen = json.loads((ROOT / 'compatibility/f10/authored-dependency-dispositions.json').read_text())
        live = [row for row in frozen['symbol_uses']
                if row['module'] == '@angular/material/menu' and row['symbol'] == 'MatMenuItem']
        self.assertEqual({row['file'] for row in live}, {
            'legacy-menu/menu-item.ts', 'legacy-menu/internal/menu-base.ts',
            'legacy-menu/internal/menu-trigger-base.ts'})
        self.assertEqual(len(live), 3)
        self.assertTrue(all(row['status'] != 'reviewed' and row['disposition'] == 'open' for row in live))
