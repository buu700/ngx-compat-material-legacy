# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Historical lifecycle-scope checks at their original immutable source state.

All original methods/assertions execute inside the recorded complete Git graph.
Current source87/native admission uses raw current files independently.
"""
from pathlib import Path
import unittest
from tests.chip_recent_history import assert_recorded_case
ROOT=Path(__file__).resolve().parents[1]

class ChipLifecycleScope(unittest.TestCase):
    def test_all_originals_and_authored_protocol_corruptions(self):
        assert_recorded_case(self,ROOT,'lifecycle-scope',self.id())

    def test_complete_original_members_and_individual_hunk_reviews_have_exact_provenance(self):
        assert_recorded_case(self,ROOT,'lifecycle-scope',self.id())

    def test_ledger_sources_priors_and_unexecuted_native_gap_stay_explicit(self):
        assert_recorded_case(self,ROOT,'lifecycle-scope',self.id())

if __name__=='__main__':unittest.main()
