# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Historical source-qualification checks at their original immutable source state.

All original methods/assertions execute inside the recorded complete Git graph.
Current source87/native admission uses raw current files independently.
"""
from pathlib import Path
import unittest
from tests.chip_recent_history import assert_recorded_case
ROOT=Path(__file__).resolve().parents[1]

class ChipFocusSourceQualification(unittest.TestCase):
    def test_current_and_original_scopes_unknown_bytes_and_actual_CLI(self):
        assert_recorded_case(self,ROOT,'source-qualification',self.id())

    def test_twelve_binding_refreshes_keep_other1685_rows_and_original_reports(self):
        assert_recorded_case(self,ROOT,'source-qualification',self.id())

if __name__=='__main__':unittest.main()
