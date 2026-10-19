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

class OriginalPatchStorage(unittest.TestCase):
    def test_all_declared_original_bytes_and_exact_reader_change(self):
        assert_recorded_older_case(self,ROOT,'tests.test_original_patch_storage',self.id())

    def test_actual_checker_binding_positives_and_mutations_remain_incomplete_overall(self):
        assert_recorded_older_case(self,ROOT,'tests.test_original_patch_storage',self.id())

if __name__=='__main__':unittest.main()
