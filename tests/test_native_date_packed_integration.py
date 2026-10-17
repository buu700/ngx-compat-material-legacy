# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Actual packed date collector/writer and generated child; synthetic observation controls only."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[1]


class NativeDatePackedIntegration(unittest.TestCase):
    def test_current_collector_writer_and_child_gates(self):
        result=subprocess.run(['node','tests/native_date_packed_integration_probe.mjs'],cwd=ROOT,
                              capture_output=True,text=True,timeout=30)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        report=json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['actual_collector_corruptions_rejected'],180)
        self.assertEqual(report['collector_mutants_rejected'],8)
        self.assertEqual(report['actual_writer_controls'],10)
        self.assertEqual(report['generated_child_observation_negatives'],10)
        self.assertEqual(report['child_predicate_mutants_rejected'],2)
        self.assertEqual(report['full_roster'],106)
        self.assertTrue(report['packed_collector_integrated'])
        self.assertTrue(report['original_complete_producer_recovered'])
        self.assertTrue(report['original_manual_calendar_provider_and_ok_checks_unchanged'])
        self.assertFalse(report['actual_Angular_DI_or_artifact_factory_executed'])
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])
