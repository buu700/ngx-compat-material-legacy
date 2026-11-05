# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Pure ordinary24/nested41 parity. No Sass, current reader, or gate imports."""
import hashlib
import importlib.util
import json
import re
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('ordinary_control_css', ROOT / 'scripts/sass_ordinary_control_css.py')
MODEL = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODEL)
VECTOR_PATH = ROOT / 'compatibility/rc/ordinary-control-css-python-vectors-v1.json'
PACKET = json.loads(VECTOR_PATH.read_bytes())

def measure(css):
    return dict(css=css, css_sha256=hashlib.sha256(css.encode()).hexdigest(), css_bytes=len(css.encode()))

def functions(row):
    if row['kind'] == 'ordinary':
        return MODEL.ordinary_checkbox_button_expected_css, MODEL.ordinary_checkbox_button_results_match
    return MODEL.legacy_datepicker_button_expected_css, MODEL.legacy_datepicker_button_results_match

class OrdinaryControlCssTests(unittest.TestCase):
    def test_frozen_sources_and_exact_case_population(self):
        for row in PACKET['inputs']:
            raw = (ROOT / row['path']).read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(), row['sha256'])
            self.assertEqual(len(raw), row['bytes'])
        self.assertEqual(tuple(PACKET['ordinary_case_ids']), MODEL.ORDINARY_CHECKBOX_BUTTON_CASES)
        self.assertEqual(tuple(PACKET['legacy_case_ids']), MODEL.LEGACY_DATEPICKER_BUTTON_CASES)
        self.assertEqual(len(MODEL.ORDINARY_CHECKBOX_BUTTON_CASES), 24)
        self.assertEqual(len(MODEL.LEGACY_DATEPICKER_BUTTON_CASES), 41)
        self.assertEqual(len(PACKET['rows']), 68)

    def test_all_frozen_js_outputs_and_result_metadata(self):
        for row in PACKET['rows']:
            with self.subTest(case=row['case_id'], kind=row['fixture_kind']):
                expected, match = functions(row)
                css = expected(dict(caseId=row['case_id'], originalCss=row['original']['css']))
                self.assertEqual(css, row['expected']['css'])
                self.assertEqual(measure(css), row['expected'])
                self.assertTrue(match(dict(caseId=row['case_id'], original=row['original'], actual=row['expected'])))
                self.assertFalse(match(dict(caseId=row['case_id'], original=row['original'], actual=measure(css + '\n'))))
                self.assertFalse(match(dict(caseId=row['case_id'], original=row['original'], actual=measure(css + '\n.foreign { color: red; }'))))
                for field, value in [('css_sha256', '0' * 64), ('css_bytes', True), ('css_bytes', float(row['expected']['css_bytes']))]:
                    self.assertFalse(match(dict(caseId=row['case_id'], original=row['original'], actual={**row['expected'], field: value})))
                    self.assertFalse(match(dict(caseId=row['case_id'], original={**row['original'], field: value}, actual=row['expected'])))

    def test_positioned_values_and_unmodified_surroundings(self):
        for row in PACKET['rows']:
            expected, match = functions(row)
            css = row['expected']['css']
            aliases = [line for line in css.split('\n') if line.startswith('  --mat-button-') or line.startswith('  --mat-checkbox-')]
            self.assertTrue(aliases)
            # Omission, changed value, changed role and changed insertion position.
            for mutant in [css.replace(aliases[0] + '\n', '', 1),
                           css.replace(aliases[0], aliases[0].replace(': ', ': wrong ', 1), 1),
                           css.replace(aliases[0], aliases[0].replace('--mat-', '--foreign-', 1), 1),
                           aliases[0] + '\n' + css]:
                self.assertFalse(match(dict(caseId=row['case_id'], original=row['original'], actual=measure(mutant))))
            if row['kind'] == 'legacy':
                self.assertIsNone(expected(dict(caseId=row['case_id'], originalCss=row['original']['css'].replace('.mat-datepicker-content', '.foreign-datepicker'))))
                if row['original']['css'].startswith('.legacy-owned-sentinel'):
                    self.assertTrue(css.startswith('.legacy-owned-sentinel { color: inherit; }\n'))
                    self.assertIn('--mdc-icon-button-icon-color: inherit;', css)
                    self.assertFalse(match(dict(caseId=row['case_id'], original=row['original'], actual=measure(css.replace('color: inherit;', 'color: red;', 1)))))
            else:
                self.assertIsNone(expected(dict(caseId=row['case_id'], originalCss=row['original']['css'] + '\n.foreign {\n  color: red;\n}')))

    def test_unknown_cases_and_incomplete_raw_skeletons(self):
        ordinary = next(row for row in PACKET['rows'] if row['kind'] == 'ordinary')
        legacy = next(row for row in PACKET['rows'] if row['kind'] == 'legacy')
        for row in [ordinary, legacy]:
            expected, match = functions(row)
            for case in ['unknown', 'mixin-css/all-component-themes', row['case_id'] + '/unknown', None, False, 1]:
                self.assertIsNone(expected(dict(caseId=case, originalCss=row['original']['css'])))
                self.assertFalse(match(dict(caseId=case, original=row['original'], actual=row['expected'])))
            owned_decl = re.search(r'  --mdc-[^;\n]+;', row['original']['css'])[0]
            invalid_owned = row['original']['css'].replace(owned_decl, owned_decl.replace(': ', ': ; ', 1), 1)
            for css in ['', ' ', '.sentinel { color: inherit; }', invalid_owned]:
                self.assertIsNone(expected(dict(caseId=row['case_id'], originalCss=css)))

    def test_plain_data_rejects_without_callback_execution(self):
        calls = []
        class ForeignDict(dict):
            def __getitem__(self, key): calls.append('getitem'); raise RuntimeError('must not run')
            def keys(self): calls.append('keys'); raise RuntimeError('must not run')
            def get(self, *args): calls.append('get'); raise RuntimeError('must not run')
            def __iter__(self): calls.append('iter'); raise RuntimeError('must not run')
        class ForeignStr(str):
            def __hash__(self): calls.append('hash'); raise RuntimeError('must not run')
            def __eq__(self, other): calls.append('eq'); raise RuntimeError('must not run')
        class ForeignInt(int):
            def __eq__(self, other): calls.append('int-eq'); raise RuntimeError('must not run')
        class ForeignKey:
            def __hash__(self): calls.append('key-hash'); return hash('caseId')
            def __eq__(self, other): calls.append('key-eq'); raise RuntimeError('must not run')
        class PropertyObject:
            @property
            def caseId(self): calls.append('property'); raise RuntimeError('must not run')
        for row in [PACKET['rows'][0], next(r for r in PACKET['rows'] if r['kind'] == 'legacy')]:
            expected, match = functions(row)
            base = dict(caseId=row['case_id'], originalCss=row['original']['css'])
            self.assertIsNone(expected(ForeignDict(base)))
            self.assertIsNone(expected(PropertyObject()))
            for field, value in [('caseId', ForeignStr(row['case_id'])), ('originalCss', ForeignStr(row['original']['css']))]:
                self.assertIsNone(expected({**base, field: value}))
            # Non-string dict keys reject before a selected-key lookup can compare them.
            wrong_keys = {ForeignKey(): None, 'originalCss': row['original']['css']}
            calls.clear()  # Dictionary creation necessarily hashes its own key.
            self.assertIsNone(expected(wrong_keys))
            foreign_key = ForeignStr('other')
            poisoned = dict(base)
            dict.__setitem__(poisoned, 'ignored', foreign_key)
            # Unselected values are irrelevant and never called, matching JS own-field capture.
            self.assertEqual(expected(poisoned), row['expected']['css'])
            args = dict(caseId=row['case_id'], original=row['original'], actual=row['expected'])
            self.assertFalse(match(ForeignDict(args)))
            self.assertFalse(match({**args, 'original': ForeignDict(row['original'])}))
            for field, value in [('css', ForeignStr(row['expected']['css'])), ('css_sha256', ForeignStr(row['expected']['css_sha256'])), ('css_bytes', ForeignInt(row['expected']['css_bytes']))]:
                self.assertFalse(match({**args, 'actual': {**row['expected'], field: value}}))
        self.assertEqual(calls, [])

if __name__ == '__main__':
    unittest.main()
