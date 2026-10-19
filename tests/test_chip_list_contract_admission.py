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

class ChipListContractAdmission(unittest.TestCase):
    def test_real_validator_writer_and_CLI_require_native_evidence_for_every_label(self):
        assert_recorded_older_case(self,ROOT,'tests.test_chip_list_contract_admission',self.id())

    def test_only_three_reviewed_rows_change_and_prior_review_bytes_are_preserved(self):
        assert_recorded_older_case(self,ROOT,'tests.test_chip_list_contract_admission',self.id())

if __name__=='__main__':unittest.main()
