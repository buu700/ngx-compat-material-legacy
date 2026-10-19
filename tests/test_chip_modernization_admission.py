# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Original ledger/source-model tests in their recorded immutable Git graph.

Full cohort execution is historical evidence;current native guards stay live.
"""
from pathlib import Path
import unittest
from tests.older_audit_history import assert_recorded_older_case
ROOT=Path(__file__).resolve().parents[1]

class ChipModernizationAdmission(unittest.TestCase):
    def test_real_mandatory_guard_and_checker_reject_rebound_tampered_source_proofs(self):
        assert_recorded_older_case(self,ROOT,'tests.test_chip_modernization_admission',self.id())

    def test_exact_real_three_rows_keep_1694_other_raw_entries_and_all_prior_reviews(self):
        assert_recorded_older_case(self,ROOT,'tests.test_chip_modernization_admission',self.id())

if __name__=='__main__':unittest.main()
