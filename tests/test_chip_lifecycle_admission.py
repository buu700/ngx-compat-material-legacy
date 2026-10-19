# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Historical lifecycle-admission checks at their original immutable source state.

All original methods/assertions execute inside the recorded complete Git graph.
Current source87/native admission uses raw current files independently.
"""
from pathlib import Path
import unittest
from tests.chip_recent_history import assert_recorded_case
ROOT=Path(__file__).resolve().parents[1]

class ChipLifecycleAdmission(unittest.TestCase):
    def test_actual_source_guards_native_writers_and_corruption_controls(self):
        assert_recorded_case(self,ROOT,'lifecycle-admission',self.id())

    def test_exact_seven_rows_and_no_unrelated_product_or_original_changes(self):
        assert_recorded_case(self,ROOT,'lifecycle-admission',self.id())

    def test_late_corruption_and_unknown_bytes_never_receive_historical_credit(self):
        assert_recorded_case(self,ROOT,'lifecycle-admission',self.id())

if __name__=='__main__':unittest.main()
