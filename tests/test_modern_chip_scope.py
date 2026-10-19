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

class ModernChipScope(unittest.TestCase):
    def test_current_AST_boundary_rejects_real_import_export_and_subtype_routes(self):
        assert_recorded_older_case(self,ROOT,'tests.test_modern_chip_scope',self.id())

    def test_all_original_hunks_apply_to_all_authenticated_source_preimages(self):
        assert_recorded_older_case(self,ROOT,'tests.test_modern_chip_scope',self.id())

if __name__=='__main__':unittest.main()
