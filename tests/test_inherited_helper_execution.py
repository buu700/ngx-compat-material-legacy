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

class InheritedHelperExecution(unittest.TestCase):
    def test_genuine_helpers_and_actual_cli_corruptions(self):
        assert_recorded_older_case(self,ROOT,'tests.test_inherited_helper_execution',self.id())

    def test_exact_finite_dispatch_extension_and_unchanged_reviews(self):
        assert_recorded_older_case(self,ROOT,'tests.test_inherited_helper_execution',self.id())

if __name__=='__main__':unittest.main()
