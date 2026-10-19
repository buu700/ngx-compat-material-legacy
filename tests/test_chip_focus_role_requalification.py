# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Historical role-requalification checks at their original immutable source state.

All original methods/assertions execute inside the recorded complete Git graph.
Current source87/native admission uses raw current files independently.
"""
from pathlib import Path
import unittest
from tests.chip_recent_history import assert_recorded_case
ROOT=Path(__file__).resolve().parents[1]

class ChipFocusRoleRequalification(unittest.TestCase):
    def test_role_identity_actual_admission_and_rejection_controls(self):
        assert_recorded_case(self,ROOT,'role-requalification',self.id())

    def test_only21_receipts_and_snapshot_metadata_change(self):
        assert_recorded_case(self,ROOT,'role-requalification',self.id())

    def test_full_CLI_still_refuses_runtime_and_remaining_source_gaps(self):
        assert_recorded_case(self,ROOT,'role-requalification',self.id())

if __name__=='__main__':unittest.main()
