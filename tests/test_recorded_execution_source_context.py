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

class RecordedExecutionSourceContext(unittest.TestCase):
    def test_actual_current_definitions_and_preserved_source_subjects(self):
        assert_recorded_older_case(self,ROOT,'tests.test_recorded_execution_source_context',self.id())

    def test_python_history_preserves_unknown_bytes_and_rejects_corrupt_inputs(self):
        assert_recorded_older_case(self,ROOT,'tests.test_recorded_execution_source_context',self.id())

if __name__=='__main__':unittest.main()
