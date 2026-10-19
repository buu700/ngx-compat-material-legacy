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

class ContentObserverAdmission(unittest.TestCase):
    def test_actual_writer_validator_and_cli_fixtures(self):
        assert_recorded_older_case(self,ROOT,'tests.test_content_observer_admission',self.id())

    def test_exact_source_and_native_review_transition(self):
        assert_recorded_older_case(self,ROOT,'tests.test_content_observer_admission',self.id())

    def test_unreviewed_deltas_rejected(self):
        assert_recorded_older_case(self,ROOT,'tests.test_content_observer_admission',self.id())

if __name__=='__main__':unittest.main()
