"""Pure expected-only composition; no source, compiler or artifact authority.

Copyright Google LLC All Rights Reserved.
Copyright (c) 2026 Ryan Lester.
Use of this source code is governed by the MIT license in LICENSE.
"""
import hashlib
import re
from sass_spinner_snack_aggregate_admission import SPINNER_SNACK_AGGREGATE_CASES
from sass_ordinary_control_css import ordinary_checkbox_button_expected_css

ORDINARY_AGGREGATE_CASES = tuple(SPINNER_SNACK_AGGREGATE_CASES)


def _component_case(case_id, family):
    parts = case_id.split('/')
    dimension = 'color' if parts[1] == 'all-component-colors' else 'theme' if parts[1] == 'all-component-themes' else 'typography'
    return parts[0] + '/' + family + '-' + dimension + ('/' + parts[2] if len(parts) == 3 else '')


def _fragments(css, scope):
    # Flat root rules only: nested datepicker/legacy bytes stay outside the edits.
    pattern = re.compile(r'^(' + re.escape(scope) + r'[^{}]*) \{\n([^{}]*)\n\}', re.M)
    rules = [dict(start=m.start(), end=m.end(), header=m[1], body=m[2]) for m in pattern.finditer(css)]

    def family_rules(family):
        classes = r'mat-mdc-checkbox(?:-touch-target)?' if family == 'checkbox' else r'(?:mat-mdc-(?:button|unelevated-button|raised-button|outlined-button)|mdc-button)'
        selector = re.compile('^' + re.escape(scope) + r' \.' + classes + r'(?=[.#:\[\s]|$)')
        root_token = re.compile(r'(?:^|\n)  --(?:mdc-checkbox-|mat-checkbox-)' if family == 'checkbox' else r'(?:^|\n)  --mat-button-(?:text|filled|protected|outlined)-')
        selected = [(i, rule) for i, rule in enumerate(rules) if any(selector.search(value) for value in re.split(r',\s*', rule['header'])) or (rule['header'] == scope and root_token.search(rule['body']))]
        assert selected, 'missing ordinary root fragment'
        assert [index for index, _ in selected] == list(range(selected[0][0], selected[0][0] + len(selected))), 'ordinary root fragment is not contiguous'
        start, end = selected[0][1]['start'], selected[-1][1]['end']
        original = css[start:end]
        assert css.count(original) == 1, 'duplicate ordinary root fragment'
        return dict(family=family, start=start, end=end, original=original)

    checkbox, button = family_rules('checkbox'), family_rules('button')
    assert checkbox['end'] < button['start'], 'ordinary family order changed'
    assert css[checkbox['end']:button['start']] == '\n', 'unexpected content between ordinary root families'
    return checkbox, button


def insert_ordinary_checkbox_button_into_aggregate_model(*, case_id, css):
    """Caller authenticates complete prior expected CSS after spinner/snack.

    Candidate CSS never enters this function. Values and source authenticity are
    inherited from that prior model; only the finite owned insertions are modeled.
    """
    try:
        assert type(case_id) is str and case_id in ORDINARY_AGGREGATE_CASES and type(css) is str and css and '\r' not in css
        scope = '.sass-api-probe' if case_id.startswith('mixin-css/') else '.sass-argument-probe'
        edits = []
        for fragment in _fragments(css, scope):
            expected = ordinary_checkbox_button_expected_css(dict(caseId=_component_case(case_id, fragment['family']), originalCss=fragment['original']))
            assert expected is not None, 'unmodeled ordinary root fragment'
            edits.append((fragment, expected))
        result = css
        for fragment, expected in sorted(edits, key=lambda item: item[0]['start'], reverse=True):
            result = result[:fragment['start']] + expected + result[fragment['end']:]
        return result
    except (AssertionError, KeyError, TypeError, ValueError):
        return None


def ordinary_aggregate_results_match(args):
    """Compare complete candidate CSS, including all untouched surrounding bytes."""
    try:
        assert type(args) is dict
        case_id, original, actual = (args[key] for key in ('caseId', 'original', 'actual'))
        for value in (original, actual):
            assert type(value) is dict and type(value['css']) is str
            raw = value['css'].encode()
            assert type(value['css_sha256']) is str and value['css_sha256'] == hashlib.sha256(raw).hexdigest()
            assert type(value['css_bytes']) is int and value['css_bytes'] == len(raw)
        expected = insert_ordinary_checkbox_button_into_aggregate_model(case_id=case_id, css=original['css'])
        return expected is not None and actual['css'] == expected
    except (AssertionError, KeyError, TypeError, ValueError):
        return False


def insertOrdinaryCheckboxButtonIntoAggregateModel(args):
    try:
        assert type(args) is dict
        return insert_ordinary_checkbox_button_into_aggregate_model(case_id=args['caseId'], css=args['css'])
    except (AssertionError, KeyError, TypeError, ValueError):
        return None


ordinary_aggregate_expected_css = insert_ordinary_checkbox_button_into_aggregate_model
ordinaryAggregateExpectedCss = insertOrdinaryCheckboxButtonIntoAggregateModel
ordinaryAggregateResultsMatch = ordinary_aggregate_results_match
