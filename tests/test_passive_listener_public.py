# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Public listener-option normalization at exact historical caller boundaries."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PassiveListenerPublicTests(unittest.TestCase):
    def test_genuine_tagged_and_minimum_options_with_counterexamples(self):
        result = subprocess.run(['node', '--max-old-space-size=768',
                                 'tests/passive_listener_public_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        cases = report['source_review']['cases']
        self.assertEqual(len(cases), 4)
        self.assertEqual(sum(len(row['option_consumers']) for row in cases), 18)
        self.assertTrue(all(row['tagged_initializer_matches'] for row in cases))
        self.assertTrue(report['source_review']['prior_owned_renderer_boundary_preserved'])
        self.assertEqual(len(report['declarations']), 3)
        self.assertEqual(len(report['results']), 12)
        for result in report['results']:
            self.assertEqual(result['probe_calls'], 1)
            self.assertFalse(result['input_mutation'])
            self.assertFalse(result['native_execution'])
        self.assertEqual(len(report['strict_types']), 3)
        for row in report['strict_types']:
            self.assertTrue(row['strict'])
            self.assertFalse(row['skip_lib_check'])
            self.assertEqual(row['negative_controls'], 6)
            self.assertEqual(row['exact_owned_option_calls'], 4)
        self.assertEqual(len(report['source_mutations']), 13)
        self.assertEqual(len(report['runtime_mutations']), 12)
        self.assertFalse(report['native_execution'])
        self.assertFalse(report['full_packed_consumer_build_executed'])
        self.assertEqual(report['g11_claim'], 'not-passed')
