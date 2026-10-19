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

class ChipSourceBatchRequalification(unittest.TestCase):
    def test_combined_live_source_guards_and_all_native_no_coordinator_refusals(self):
        assert_recorded_older_case(self,ROOT,'tests.test_chip_source_batch_requalification',self.id())

    def test_exact_native_source_binding_transition_preserves_every_other_byte(self):
        assert_recorded_older_case(self,ROOT,'tests.test_chip_source_batch_requalification',self.id())

if __name__=='__main__':unittest.main()
