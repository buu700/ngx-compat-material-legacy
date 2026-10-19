# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Historical focus-repair checks at their original immutable source state.

All original methods/assertions execute inside the recorded complete Git graph.
Current source87/native admission uses raw current files independently.
"""
from pathlib import Path
import unittest
from tests.chip_recent_history import assert_recorded_case
ROOT=Path(__file__).resolve().parents[1]

class ChipFocusRepair(unittest.TestCase):
    def test_current_focus_protocols_reproduce_before_and_reject_semantic_regressions(self):
        assert_recorded_case(self,ROOT,'focus-repair',self.id())

    def test_complete_preimages_ledger_and_unrelated_product_members_are_preserved(self):
        assert_recorded_case(self,ROOT,'focus-repair',self.id())

    def test_historical_view_rehashes_live_inputs_and_cannot_be_poisoned(self):
        assert_recorded_case(self,ROOT,'focus-repair',self.id())

if __name__=='__main__':unittest.main()
