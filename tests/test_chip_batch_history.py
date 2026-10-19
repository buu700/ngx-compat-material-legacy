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

class ChipBatchHistory(unittest.TestCase):
    def test_JS_exact_current_source_predecessors_and_stage_controls(self):
        assert_recorded_older_case(self,ROOT,'tests.test_chip_batch_history',self.id())

    def test_Python_unknown_source_stage_and_cache_controls(self):
        assert_recorded_older_case(self,ROOT,'tests.test_chip_batch_history',self.id())

    def test_original_source_and_stage_preimages_are_the_actual_committed_bytes(self):
        assert_recorded_older_case(self,ROOT,'tests.test_chip_batch_history',self.id())

if __name__=='__main__':unittest.main()
