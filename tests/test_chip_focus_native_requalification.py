# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Historical native-requalification checks at their original immutable source state.

All original methods/assertions execute inside the recorded complete Git graph.
Current source87/native admission uses raw current files independently.
"""
from pathlib import Path
import unittest
from tests.chip_recent_history import assert_recorded_case
ROOT=Path(__file__).resolve().parents[1]

class ChipFocusNativeRequalification(unittest.TestCase):
    def test_all_current_native_guards_and_source_corruptions(self):
        assert_recorded_case(self,ROOT,'native-requalification',self.id())

    def test_exact_source_only_transition_preserves_other_rows_and_every_original(self):
        assert_recorded_case(self,ROOT,'native-requalification',self.id())

    def test_actual_CLI_reaches_runtime_gate_and_retains_all_other_failures(self):
        assert_recorded_case(self,ROOT,'native-requalification',self.id())

if __name__=='__main__':unittest.main()
