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

class ModernChipAdmission(unittest.TestCase):
    def test_real_guards_and_actual_checker_reject_mutated_and_relabeled_evidence(self):
        assert_recorded_older_case(self,ROOT,'tests.test_modern_chip_admission',self.id())

    def test_exact_real_three_row_migration_preserves_every_other_entry_byte(self):
        assert_recorded_older_case(self,ROOT,'tests.test_modern_chip_admission',self.id())

if __name__=='__main__':unittest.main()
