# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite six-role integration; raw source/native checks remain independent."""
import ast
import json
import os
from pathlib import Path
import subprocess
import unittest
from tests.ripple_global_options_integration import integration_state, LEDGER

ROOT = Path(__file__).resolve().parents[1]


def rows(text):
    decoder = json.JSONDecoder()
    index = text.index('[', text.index('"symbol_uses"')) + 1
    result = []
    while True:
        while text[index].isspace() or text[index] == ',':
            index += 1
        if text[index] == ']':
            return result
        row, end = decoder.raw_decode(text, index)
        result.append((row, text[index:end])); index = end


class RippleGlobalOptionsIntegration(unittest.TestCase):
    def test_exact_six_admissions_and_unknown_byte_rejections(self):
        command = ['node', 'tests/ripple_global_options_integration_probe.mjs']
        if os.environ.get('NGX_RIPPLE_INTEGRATION_DIAGNOSTIC'):
            command.append(os.environ['NGX_RIPPLE_INTEGRATION_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-10000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['selected_roles_admitted'], 6)
        self.assertEqual((report['frozen_uses'], report['reviewed'], report['open']), (1736, 1452, 284))
        self.assertEqual(report['rejection_controls'], 29 if report['line'] == 'main' else 28)
        self.assertEqual(report['current_source_reader_substitutions'], 0)
        self.assertEqual(report['native_admission_exceptions_added'], 0)
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])

    def test_original_rows_assertions_and_current_native_methods_are_preserved(self):
        prior, inputs = integration_state(ROOT)
        original = prior['ledger']['text']; current = (ROOT / LEDGER).read_text()
        before, after = rows(original), rows(current)
        self.assertEqual(len(before), 1736); self.assertEqual(len(after), 1736)
        wanted = {(r['file'], r['module'], r['symbol']) for r in prior['selected']}
        restored = current; count = 0
        for (a, old), (b, new) in zip(before, after):
            identity = (a['file'], a['module'], a['symbol'])
            self.assertEqual(identity, (b['file'], b['module'], b['symbol']))
            if identity in wanted:
                expected = dict(a, status='reviewed', disposition='closed', source_review=prior['review'])
                self.assertEqual(b, expected); restored = restored.replace(new, old, 1); count += 1
            else:
                self.assertEqual(new, old)
        self.assertEqual(count, 6)
        restored = restored.replace('"reviewed_uses": 1452', '"reviewed_uses": 1446', 1)
        restored = restored.replace('"open_uses": 284', '"open_uses": 290', 1)
        restored = restored.replace(json.dumps(json.loads(current)['note']), json.dumps(json.loads(original)['note']), 1)
        self.assertEqual(restored, original)
        for edit in inputs['test_context_edits']:
            member = next(m for m in prior['test_preimages'] if m['path'] == edit['path'])
            if not edit['path'].endswith('.py'):
                continue
            before, after = ast.parse(member['text']), ast.parse((ROOT / edit['path']).read_text())
            def assertions(tree):
                return [n.func.attr for n in ast.walk(tree) if isinstance(n, ast.Call)
                        and isinstance(n.func, ast.Attribute) and n.func.attr.startswith('assert')]
            self.assertEqual(assertions(before), assertions(after))
            if edit['path'] == 'tests/test_current_audit_native.py':
                methods = lambda tree: {m.name: m for m in ast.walk(tree) if isinstance(m, ast.FunctionDef)}
                a, b = methods(before), methods(after)
                for name in ['test_all_current_profiles_and_three_derived_source_reviews',
                             'test_wrong_review_path_selected_body_and_late_document_bytes_reject']:
                    self.assertEqual(ast.get_source_segment(member['text'], a[name]),
                                     ast.get_source_segment((ROOT / edit['path']).read_text(), b[name]))


if __name__ == '__main__':
    unittest.main()
