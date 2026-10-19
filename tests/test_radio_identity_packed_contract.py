# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Mandatory packed mixed-generation radio observation admission."""
import json
from pathlib import Path
import subprocess
import unittest
from tests.packed_collector_history import assert_recorded_collector_case

ROOT = Path(__file__).resolve().parents[1]

class PackedRadioIdentityTests(unittest.TestCase):
    def test_observation_collector_writer_and_exact_source_controls(self):
        assert_recorded_collector_case(self, ROOT, self.id())
