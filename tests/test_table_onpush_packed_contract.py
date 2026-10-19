# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Admission regressions, without claiming actual packed Angular execution."""
import json
from pathlib import Path
import subprocess
import unittest
from tests.packed_collector_history import assert_recorded_collector_case

ROOT = Path(__file__).resolve().parents[1]


class TableOnPushPackedContractTests(unittest.TestCase):
    def test_requires_bound_attributes_stable_input_transitions_and_destroy(self):
        assert_recorded_collector_case(self, ROOT, self.id())
