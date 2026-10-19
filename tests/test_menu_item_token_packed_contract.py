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
from tests.packed_collector_history import assert_recorded_collector_case

ROOT = Path(__file__).resolve().parents[1]


class MenuItemTokenPackedContractTests(unittest.TestCase):
    def test_actual_collector_writer_and_preserved_source_preimages(self):
        assert_recorded_collector_case(self, ROOT, self.id())

    def test_three_live_token_uses_remain_pending(self):
        frozen = json.loads((ROOT / 'compatibility/f10/authored-dependency-dispositions.json').read_text())
        live = [row for row in frozen['symbol_uses']
                if row['module'] == '@angular/material/menu' and row['symbol'] == 'MatMenuItem']
        self.assertEqual({row['file'] for row in live}, {
            'legacy-menu/menu-item.ts', 'legacy-menu/internal/menu-base.ts',
            'legacy-menu/internal/menu-trigger-base.ts'})
        self.assertEqual(len(live), 3)
        self.assertTrue(all(row['status'] != 'reviewed' and row['disposition'] == 'open' for row in live))
