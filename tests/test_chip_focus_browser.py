# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Historical focus-browser checks at their original immutable source state.

All original methods/assertions execute inside the recorded complete Git graph.
Current source87/native admission uses raw current files independently.
"""
from pathlib import Path
import unittest
from tests.chip_recent_history import assert_recorded_case
ROOT=Path(__file__).resolve().parents[1]

class ChipFocusBrowser(unittest.TestCase):
    def test_generated_fixture_and_whole_probe_callback_controls(self):
        assert_recorded_case(self,ROOT,'focus-browser',self.id())

    def test_original_provenance_and_existing_form_contract_are_retained(self):
        assert_recorded_case(self,ROOT,'focus-browser',self.id())

if __name__=='__main__':unittest.main()
