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

class RecordedExecutionAdmissionTests(unittest.TestCase):
    def test_real_entries_preserve_the_original_proofs_and_require_current_runs(self):
        assert_recorded_older_case(self,ROOT,'tests.test_recorded_execution_admission',self.id())

    def test_current_readers_source_semantics_and_actual_CLI(self):
        assert_recorded_older_case(self,ROOT,'tests.test_recorded_execution_admission',self.id())

    def test_actual_coordinator_supplies_the_current_Sass_child_outcome(self):
        assert_recorded_older_case(self,ROOT,'tests.test_recorded_execution_admission',self.id())

if __name__=='__main__':unittest.main()
