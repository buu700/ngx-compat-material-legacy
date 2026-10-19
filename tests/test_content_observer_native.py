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

class ContentObserverNative(unittest.TestCase):
    def test_synthetic_native_contract_and_generated_strict_ts(self):
        assert_recorded_older_case(self,ROOT,'tests.test_content_observer_native',self.id())

    def test_exact_surface_source_addition_and_three_native_contexts(self):
        assert_recorded_older_case(self,ROOT,'tests.test_content_observer_native',self.id())

    def test_current_context_rejects_unreviewed_deltas(self):
        assert_recorded_older_case(self,ROOT,'tests.test_content_observer_native',self.id())

if __name__=='__main__':unittest.main()
