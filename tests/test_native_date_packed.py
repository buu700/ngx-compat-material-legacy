# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Native date observation foundation; collector integration has separate controls."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[1]


class NativeDatePackedTests(unittest.TestCase):
    def test_predicates_and_generated_observer_protocol(self):
        for timezone in ['America/New_York','UTC','Pacific/Auckland']:
            with self.subTest(timezone=timezone):
                result=subprocess.run(['node','tests/native_date_packed_probe.mjs'],cwd=ROOT,
                                      capture_output=True,text=True,timeout=30,
                                      env={**os.environ,'TZ':timezone})
                self.assertEqual(result.returncode,0,result.stdout+result.stderr)
                report=json.loads(result.stdout.strip().splitlines()[-1])
                self.assertEqual(report['predicate_corruption_controls'],174)
                self.assertEqual(report['generated_observer_protocol_defects_detected'],9)
                self.assertEqual(report['observer_status_mutants_rejected'],4)
                self.assertEqual(report['existing_case_ids_unchanged'],106)
                self.assertFalse(report['packed_collector_exercised'])
                self.assertFalse(report['actual_Angular_DI_or_artifact_factory_executed'])
                self.assertFalse(report['actual_native_packed_or_floor_qualified'])

    def test_generated_fixture_with_actual_owned_sources_and_public_types(self):
        result=subprocess.run(['node','tests/native_date_packed_typecheck.mjs'],cwd=ROOT,
                              capture_output=True,text=True,timeout=45)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        report=json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['diagnostics'],0)
        self.assertEqual(report['constructor_and_method_type_mutants_rejected'],2)
        self.assertTrue(report['strict'])
        self.assertFalse(report['skipLibCheck'])
        self.assertTrue(report['owned_sources_copied_verbatim'])
        self.assertFalse(report['actual_Angular_compiler_or_DI_executed'])
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])
