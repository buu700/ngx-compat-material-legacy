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

class ChipAuditSourceRequalification(unittest.TestCase):
    def test_current_definitions_roles_and_real_source_checker(self):
        assert_recorded_older_case(self,ROOT,'tests.test_chip_audit_source_requalification',self.id())

    def test_finite_source_transition_preserves_all_unrelated_entry_bytes(self):
        assert_recorded_older_case(self,ROOT,'tests.test_chip_audit_source_requalification',self.id())

    def test_classic_multirow_native_proof_has_one_explicit_owner(self):
        assert_recorded_older_case(self,ROOT,'tests.test_chip_audit_source_requalification',self.id())

if __name__=='__main__':unittest.main()
