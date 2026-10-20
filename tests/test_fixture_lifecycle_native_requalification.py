# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Six individual source successors preserve real execution requirements."""
import ast
import gzip
import json
import os
from pathlib import Path
import subprocess
import unittest
from tests.tab_portal_source_requalification import historical_source_members, historical_member_bytes

ROOT = Path(__file__).resolve().parents[1]


class FixtureLifecycleNativeRequalification(unittest.TestCase):
    def test_current_six_source_proofs_and_corruption_controls(self):
        command = ['node', 'tests/fixture_lifecycle_native_requalification_probe.mjs']
        if os.environ.get('NGX_FIXTURE_NATIVE_REQUALIFICATION_DIAGNOSTIC'):
            command.append(os.environ['NGX_FIXTURE_NATIVE_REQUALIFICATION_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-10000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['source_only_native_proofs_requalified'], 6)
        self.assertEqual(report['rejection_controls'], 57)
        self.assertEqual(report['unrelated_SHA_rows_preserved'], 1691)
        self.assertTrue(report['raw_six_validators_refuse_missing_coordinator'])
        self.assertTrue(report['unselected_ledger_and_envelope_bytes_preserved'])
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])

    def test_original_task_assertions_and_exact_context_substitutions_survive(self):
        parent_members = historical_source_members(ROOT)
        prior = json.loads(gzip.decompress((ROOT/'compatibility/rc/fixture-lifecycle-native-requalification-prior.json.gz').read_bytes()))
        for edit in prior['context_preimages']:
            before = edit['text']; expected = before
            for start, end in edit['substitutions']:
                self.assertEqual(expected.count(start), 1)
                expected = expected.replace(start, end)
            actual = historical_member_bytes(ROOT, edit['path'], parent_members).decode()
            self.assertEqual(actual, expected)
            def assertions(text):
                return [n.func.attr for n in ast.walk(ast.parse(text)) if isinstance(n, ast.Call)
                        and isinstance(n.func, ast.Attribute) and n.func.attr.startswith('assert')]
            self.assertEqual(assertions(before), assertions(actual))


if __name__ == '__main__':
    unittest.main()
