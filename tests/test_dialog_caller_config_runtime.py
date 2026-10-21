# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Original candidate source program; current applied-product checks stay live."""
from pathlib import Path
import unittest
from tests.dialog_caller_history import assert_recorded_candidate_case
ROOT = Path(__file__).resolve().parents[1]


class DialogCallerConfigCandidateRuntime(unittest.TestCase):
    def test_tagged_defaults_JIT_constructor_and_fresh_input_boundaries(self):
        assert_recorded_candidate_case(self, ROOT, 'tests.test_dialog_caller_config_runtime', self.id())


if __name__ == '__main__':
    unittest.main()
