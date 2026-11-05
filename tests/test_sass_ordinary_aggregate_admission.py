# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Retained18 prior aggregate rows, finite expected-only model parity; no compiler."""
import copy
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import sass_ordinary_aggregate_admission as model
from sass_ordinary_control_css import ordinary_checkbox_button_expected_css

NODE = '/nix/store/w8jijs92barihdb0z54dsgq5szj2wd47-nodejs-24.21.0/bin/node'
PREFIX = 'compatibility/rc/current-sass-ordinary-aggregate-'


def measured(css):
    raw = css.encode()
    return dict(css=css, css_sha256=hashlib.sha256(raw).hexdigest(), css_bytes=len(raw))


class OrdinaryAggregateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        worksheet = json.loads((ROOT / (PREFIX + 'worksheet.json')).read_bytes())
        cls.line = '21.x' if json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
        for ref in worksheet['exact_inputs'][cls.line]:
            raw = (ROOT / ref['path']).read_bytes()
            assert len(raw) == ref['bytes'] and hashlib.sha256(raw).hexdigest() == ref['sha256']
        cls.rows = []
        for label in ('21', 'main'):
            packet = json.loads((ROOT / ('compatibility/rc/parent-spinner-snack-aggregate-integration-' + label + '-v1.json')).read_bytes())
            assert tuple(row['case_id'] for row in packet['rows']) == model.ORDINARY_AGGREGATE_CASES
            for row in packet['rows']:
                assert measured(row['current']['css'])['css_sha256'] == row['current']['css_sha256']
                cls.rows.append(dict(line=packet['line'], caseId=row['case_id'], css=row['current']['css']))
        cls.checks, cls.expected_vectors, cls.match_vectors, cls.outputs = [], [], [], []

    def expected(self, label, case, css, accepts):
        result = model.insert_ordinary_checkbox_button_into_aggregate_model(case_id=case, css=css)
        self.assertEqual(result is not None, accepts, label)
        ref = measured(result) if accepts else None
        self.expected_vectors.append(dict(label=label, caseId=case, css=css, sha256=ref['css_sha256'] if accepts else None, bytes=ref['css_bytes'] if accepts else None))
        self.checks.append(label)
        return result

    def match(self, label, case, original, actual, accept):
        args = dict(caseId=case, original=original, actual=actual)
        self.assertEqual(model.ordinary_aggregate_results_match(args), accept, label)
        self.match_vectors.append(dict(label=label, args=args, accept=accept));self.checks.append(label)

    def test_a_reused18_expected_models(self):
        for row in self.rows:
            label = row['line'] + ' ' + row['caseId']
            result = self.expected('compose ' + label, row['caseId'], row['css'], True)
            self.match('whole CSS positive ' + label, row['caseId'], measured(row['css']), measured(result), True)
            scope = '.sass-api-probe' if row['caseId'].startswith('mixin-css/') else '.sass-argument-probe'
            fragments = model._fragments(row['css'], scope)
            # The finite root model is already qualified independently. At this
            # seam verify only exact range splicing and all outer bytes retained.
            prior_cursor, current_cursor = 0, 0
            for fragment in fragments:
                surrounding = row['css'][prior_cursor:fragment['start']]
                self.assertEqual(result[current_cursor:current_cursor + len(surrounding)], surrounding)
                current_cursor += len(surrounding)
                root = ordinary_checkbox_button_expected_css(dict(caseId=model._component_case(row['caseId'], fragment['family']), originalCss=fragment['original']))
                self.assertEqual(result[current_cursor:current_cursor + len(root)], root)
                current_cursor += len(root);prior_cursor = fragment['end']
            self.assertEqual(result[current_cursor:], row['css'][prior_cursor:])
            self.outputs.append(dict(line=row['line'], case_id=row['caseId'], previous=measured(row['css']) | {'css': None}, expected=measured(result) | {'css': None}))

    def test_b_malformed_owned_fragments(self):
        # Three dimensions, one retained floor. The other floor is covered by
        # all9 whole-model positives; avoid a case x field matrix.
        for row in self.rows[:3]:
            css, case = row['css'], row['caseId'];scope = '.sass-api-probe'
            checkbox, button = model._fragments(css, scope)
            first = re.search(r'^[^{}]+ \{\n[^{}]*\n\}', checkbox['original']).group(0)
            bad = css[:checkbox['start']] + css[checkbox['start'] + len(first):]
            self.expected('omitted checkbox rule ' + case, case, bad, False)
            lines = checkbox['original'].splitlines(True);lines[1], lines[2] = lines[2], lines[1]
            bad = css[:checkbox['start']] + ''.join(lines) + css[checkbox['end']:]
            self.expected('reordered checkbox declarations ' + case, case, bad, False)
            bad = css[:checkbox['start']] + checkbox['original'].replace(scope, scope + '.foreign', 1) + css[checkbox['end']:]
            self.expected('moved root selector ' + case, case, bad, False)
            bad = css[:button['start']] + button['original'] + '\n' + button['original'] + css[button['end']:]
            self.expected('duplicated button fragment ' + case, case, bad, False)
            bad = css[:button['start']] + scope + ' .mat-mdc-button.foreign {\n  color: red;\n}\n' + css[button['start']:]
            self.expected('unmodeled owned button selector ' + case, case, bad, False)
            bad = css[:checkbox['start']] + button['original'] + '\n' + checkbox['original'] + css[button['end']:]
            self.expected('family order changed ' + case, case, bad, False)
            composed = model.insert_ordinary_checkbox_button_into_aggregate_model(case_id=case, css=css)
            self.expected('already composed model ' + case, case, composed, False)
        for case in ('mixin-css/all-component-densities', 'mixin-css/checkbox-theme', 'mixin-css/all-legacy-component-themes'):
            self.expected('unknown case ' + case, case, self.rows[0]['css'], False)

    def test_c_complete_candidate_comparison(self):
        for row in self.rows[:3]:
            css, case = row['css'], row['caseId']
            expected = model.insert_ordinary_checkbox_button_into_aggregate_model(case_id=case, css=css)
            for label, actual in (
                ('unrelated candidate byte', expected + '\n.foreign { color: red; }\n'),
                ('owned candidate value', expected.replace('--mat-checkbox-', '--mat-checkbox-foreign-', 1)),
                ('candidate omission', css),
            ):
                self.match(label + ' ' + case, case, measured(css), measured(actual), False)
            bad = measured(expected);bad['css_sha256'] = '0' * 64
            self.match('candidate digest contradiction ' + case, case, measured(css), bad, False)
        row = self.rows[0];case = row['caseId']
        # Authenticated prior surrounding bytes are caller-owned, not filtered.
        sentinel = '\n/* untouched Δ */\n.sass-api-probe .mat-datepicker-content .mat-mdc-button {\n  color: red;\n}\n'
        css = row['css'] + sentinel
        expected = self.expected('preserve nested legacy and Unicode prior bytes', case, css, True)
        self.assertTrue(expected.endswith(sentinel))
        self.match('nested candidate mutation rejects', case, measured(css), measured(expected.replace(sentinel, sentinel.replace('red', 'blue'))), False)

    def test_z_independent_javascript_parity(self):
        completed = subprocess.run([NODE, str(ROOT / 'tests/sass_ordinary_aggregate_probe.mjs')], cwd=ROOT,
            input=json.dumps(dict(expected=self.expected_vectors, matches=self.match_vectors)), capture_output=True, text=True)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        javascript = json.loads(completed.stdout)
        self.assertEqual(javascript['case_roster'], list(model.ORDINARY_AGGREGATE_CASES));self.assertEqual(javascript['getter_calls'], 0)
        report = dict(schema_version=1, role='Pure expected-only aggregate model controls; current CSS not observed', line=self.line,
            prior_compiled_rows_reused=18, modeled_outputs=self.outputs, python_controls=self.checks,
            javascript=javascript, compiler_calls=0, source_or_artifact_admission=False, fresh_current_ordinary_aggregate_CSS_qualified=False,
            packed_browser_floor_fullowner_or_G11_qualified=False)
        path = ROOT / (PREFIX + 'controls-' + ('21x' if self.line == '21.x' else 'main') + '.json')
        self.assertFalse(path.exists());path.write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    unittest.main()
