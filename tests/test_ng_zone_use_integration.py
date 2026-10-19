# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact twelve-use ledger delta and preservation of original assertions/native code."""
import ast
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch
from tests.ng_zone_use_integration import historical_protected_bytes
from tests.test_ripple_global_options_integration import rows

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/authored-dependency-dispositions.json'
PRIOR = 'compatibility/rc/ng-zone-use-integration-prior.json.gz'


class NgZoneUseIntegration(unittest.TestCase):
    def test_exact_admissions_and_rejection_controls(self):
        command = ['node', 'tests/ng_zone_use_integration_probe.mjs']
        if os.environ.get('NGX_ZONE_INTEGRATION_DIAGNOSTIC'):
            command.append(os.environ['NGX_ZONE_INTEGRATION_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=240)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-10000:])
        report = json.loads(child.stdout)
        self.assertEqual((report['frozen_uses'], report['reviewed'], report['open']), (1736, 1464, 272))
        self.assertEqual(report['selected_roles_admitted'], 12)
        self.assertEqual(report['unrelated_rows_preserved'], 1724)
        self.assertEqual(report['source_review_documents'], 8)
        self.assertEqual(report['current_bound_members_rechecked'], 111)
        self.assertEqual(report['rejection_controls'], 133 if report['line'] == 'main' else 132)
        self.assertEqual(report['canonical_source_or_inherited_leaf_controls'], 13)
        self.assertTrue(report['original_six_role_checker_preserved_and_passed'])
        self.assertEqual(report['current_source_reader_substitutions'], 0)
        self.assertEqual(report['native_admission_exceptions_added'], 0)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])

    def test_raw_source_reads_stay_raw_and_context_substitutions_fail_closed(self):
        path = 'projects/ngx-material-legacy/legacy-slider/slider.ts'
        with patch('tests.ng_zone_use_integration.subprocess.run', side_effect=AssertionError('guard required')):
            self.assertEqual(historical_protected_bytes(ROOT, path), (ROOT / path).read_bytes())
            for special in [LEDGER, 'tests/test_current_audit_native.py']:
                with self.subTest(path=special), self.assertRaisesRegex(AssertionError, 'guard required'):
                    historical_protected_bytes(ROOT, special)

    def test_exact_row_bytes_and_original_assertions_and_native_methods(self):
        prior = json.loads(gzip.decompress((ROOT / PRIOR).read_bytes()))
        original = prior['ledger']['text']; current = (ROOT / LEDGER).read_text()
        before, after = rows(original), rows(current)
        self.assertEqual(len(before), 1736); self.assertEqual(len(after), 1736)
        wanted = {(r['file'], r['module'], r['symbol']): r['source_review'] for r in prior['selected']}
        restored = current; count = 0
        for (a, old), (b, new) in zip(before, after):
            identity = (a['file'], a['module'], a['symbol'])
            self.assertEqual(identity, (b['file'], b['module'], b['symbol']))
            if identity in wanted:
                self.assertEqual(b, dict(a, status='reviewed', disposition='closed', source_review=wanted[identity]))
                restored = restored.replace(new, old, 1); count += 1
            else:
                self.assertEqual(new, old)
        self.assertEqual(count, 12)
        restored = restored.replace('"reviewed_uses": 1464', '"reviewed_uses": 1452', 1)
        restored = restored.replace('"open_uses": 272', '"open_uses": 284', 1)
        restored = restored.replace(json.dumps(json.loads(current)['note']), json.dumps(json.loads(original)['note']), 1)
        self.assertEqual(restored, original)
        for edit in prior['test_context_edits']:
            expected = edit['text']
            for start, end in edit['substitutions']:
                self.assertEqual(expected.count(start), 1); expected = expected.replace(start, end)
            actual = (ROOT / edit['path']).read_text()
            self.assertEqual(hashlib.sha256(actual.encode()).hexdigest(), edit['after_sha256'])
            self.assertEqual(expected, actual)
            if edit['path'].endswith('.py'):
                before_tree, after_tree = ast.parse(edit['text']), ast.parse(actual)
                def assertions(tree):
                    return [n.func.attr for n in ast.walk(tree) if isinstance(n, ast.Call)
                            and isinstance(n.func, ast.Attribute) and n.func.attr.startswith('assert')]
                self.assertEqual(assertions(before_tree), assertions(after_tree))
                if edit['path'] == 'tests/test_current_audit_native.py':
                    methods = lambda tree: {n.name: n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)}
                    a, b = methods(before_tree), methods(after_tree)
                    for name in ['test_all_current_profiles_and_three_derived_source_reviews',
                                 'test_wrong_review_path_selected_body_and_late_document_bytes_reject']:
                        self.assertEqual(ast.get_source_segment(edit['text'], a[name]),
                                         ast.get_source_segment(actual, b[name]))


if __name__ == '__main__':
    unittest.main()
