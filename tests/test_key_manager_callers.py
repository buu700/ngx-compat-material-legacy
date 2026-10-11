# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact owned public key-manager boundaries against untouched peer subjects."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class KeyManagerCallerTests(unittest.TestCase):
    def test_tagged_construction_public_routes_and_peer_behavior(self):
        result = subprocess.run(
            ['node', '--experimental-vm-modules', '--max-old-space-size=768',
             'tests/key_manager_callers_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(len(report['cases']), 6)
        self.assertEqual(sum(len(row['manager_references']) for row in report['cases']), 107)
        files = {row['file'] for row in report['cases']}
        files.update(ref['file'] for row in report['cases'] for ref in row['manager_references'])
        self.assertEqual(len(files), 8)
        self.assertEqual(sum(row['manager_aliases'] for row in report['cases']), 6)
        for row in report['cases']:
            self.assertEqual(sorted(ref['role'] for ref in row['class_references']),
                             ['erased-type', 'public-construction'])
        tagged = report['tagged_construction']
        self.assertEqual(len(tagged), 6)
        self.assertTrue(all(row['owned_construction_matches_tag'] for row in tagged))
        predicates = [row['predicate'] for row in tagged if row['predicate']]
        self.assertEqual(len(predicates), 2)
        self.assertTrue(all(row['owned_body_matches_tag'] for row in predicates))
        self.assertEqual(len(report['declaration_preservation']), 3)
        for row in report['declaration_preservation']:
            self.assertEqual(row['historical_public_signatures_preserved'], 73)
            self.assertEqual(row['added_overload_signatures'], 0 if row['line'] == 'original' else 3)
        self.assertEqual(len(report['strict_types']), 3)
        for row in report['strict_types']:
            self.assertTrue(row['strict'])
            self.assertFalse(row['skip_lib_check'])
            self.assertEqual(row['negative_controls'], 8)
            self.assertEqual(row['exact_constructor_chains'], 6)
        observations = report['observations']
        self.assertEqual(len(observations), 3)
        self.assertEqual(observations[0]['line'], 'original')
        for observation in observations:
            self.assertEqual(observation['callers'], observations[0]['callers'])
            self.assertEqual(len(observation['callers']), 6)
            for caller in observation['callers']:
                self.assertEqual([profile['direction'] for profile in caller['profiles']], ['ltr', 'rtl'])
                for profile in caller['profiles']:
                    self.assertTrue(profile['constructor_outside_DI'])
                    self.assertEqual(profile['destroy_completed'], 2)
            cancellation = observation['owned_cancellation']
            self.assertEqual(cancellation['actual_owned_call_expression'],
                             'this._keyManager?.cancelTypeahead()')
            self.assertTrue(cancellation['fluent_identity_preserved'])
            self.assertTrue(cancellation['pending_typeahead_callback_cancelled'])
            self.assertTrue(cancellation['later_explicit_selection_retained'])
            self.assertFalse(cancellation['native_execution'])
        self.assertEqual(len(report['mutation_rejections']), 15)
        self.assertEqual(report['g11_claim'], 'not-passed')
