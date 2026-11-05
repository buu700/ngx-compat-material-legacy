# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Pure finite raw CSS insertions; authenticate source/program/artifact externally.

No compiler, filesystem reader, current-source qualifier, or gate admission lives
here. Unknown cases and non-plain selected metadata reject without callbacks.
"""
import hashlib
import re

ORDINARY_CHECKBOX_BUTTON_CASES = tuple(
    case for family in ('checkbox', 'button')
    for dimension in ('color', 'typography', 'density', 'theme')
    for case in (
        'mixin-css/' + family + '-' + dimension,
        *('mixin-argument/' + family + '-' + dimension + '/' + variant
          for variant in ({'theme': ('custom-full-theme', 'custom-dark-theme'),
                           'color': ('custom-full-theme', 'raw-color-config'),
                           'typography': ('custom-full-theme', 'raw-typography-config'),
                           'density': ('custom-full-theme', 'raw-density-config')}[dimension])),
    )
)
# Exact41 phase plans copied from the frozen finite JS plan packet, not candidates.
_LEGACY_PLANS_LITERAL = (
    ('mixin-css/legacy-button-color', ('color',)),
    ('mixin-css/legacy-button-typography', ('typography',)),
    ('mixin-css/legacy-button-theme', ('color', 'density', 'typography')),
    ('mixin-css/all-legacy-component-colors', ('color',)),
    ('mixin-css/all-legacy-component-typographies', ('typography',)),
    ('mixin-css/all-legacy-component-themes', ('color', 'density', 'typography')),
    ('mixin-css/private-all-legacy-component-densities', ('density',)),
    ('mixin-argument/all-legacy-component-colors/custom-full-theme', ('color',)),
    ('mixin-argument/all-legacy-component-colors/raw-color-config', ('color',)),
    ('mixin-argument/all-legacy-component-themes/custom-full-theme', ('color', 'density', 'typography')),
    ('mixin-argument/all-legacy-component-themes/custom-dark-theme', ('color', 'density', 'typography')),
    ('mixin-argument/all-legacy-component-typographies/custom-full-theme', ('typography',)),
    ('mixin-argument/all-legacy-component-typographies/raw-typography-config', ('typography',)),
    ('mixin-argument/legacy-button-color/custom-full-theme', ('color',)),
    ('mixin-argument/legacy-button-color/raw-color-config', ('color',)),
    ('mixin-argument/legacy-button-theme/custom-full-theme', ('color', 'density', 'typography')),
    ('mixin-argument/legacy-button-theme/custom-dark-theme', ('color', 'density', 'typography')),
    ('mixin-argument/legacy-button-typography/custom-full-theme', ('typography',)),
    ('mixin-argument/legacy-button-typography/raw-typography-config', ('typography',)),
    ('mixin-argument/private-all-legacy-component-densities/custom-full-theme', ('density',)),
    ('mixin-argument/private-all-legacy-component-densities/raw-density-config', ('density',)),
    ('owned-aggregate/themes/modern-light', ('color', 'density', 'typography')),
    ('owned-aggregate/themes/legacy-dark', ('color', 'density', 'typography')),
    ('owned-aggregate/themes/raw-config', ('color', 'density')),
    ('owned-aggregate/themes/repeat', ('color', 'density', 'typography', 'color', 'density', 'typography')),
    ('owned-aggregate/themes/inverse', ('color', 'density', 'typography', 'color', 'density', 'typography')),
    ('owned-aggregate/colors/modern-light', ('color',)),
    ('owned-aggregate/colors/legacy-dark', ('color',)),
    ('owned-aggregate/colors/raw-config', ('color',)),
    ('owned-aggregate/colors/repeat', ('color', 'color')),
    ('owned-aggregate/colors/inverse', ('color', 'color')),
    ('owned-aggregate/typographies/modern-light', ('typography',)),
    ('owned-aggregate/typographies/legacy-dark', ('typography',)),
    ('owned-aggregate/typographies/raw-config', ('typography',)),
    ('owned-aggregate/typographies/repeat', ('typography', 'typography')),
    ('owned-aggregate/typographies/inverse', ('typography', 'typography')),
    ('owned-aggregate/densities/modern-light', ('density',)),
    ('owned-aggregate/densities/legacy-dark', ('density',)),
    ('owned-aggregate/densities/raw-config', ('density',)),
    ('owned-aggregate/densities/repeat', ('density', 'density')),
    ('owned-aggregate/densities/inverse', ('density', 'density')),
)
_LEGACY_PLANS = dict(_LEGACY_PLANS_LITERAL)
LEGACY_DATEPICKER_BUTTON_CASES = tuple(_LEGACY_PLANS)
_CHECKBOX = ('disabled-selected-icon-color', 'disabled-unselected-icon-color',
    'selected-checkmark-color', 'selected-focus-icon-color', 'selected-hover-icon-color',
    'selected-icon-color', 'selected-pressed-icon-color', 'unselected-focus-icon-color',
    'unselected-hover-icon-color', 'unselected-icon-color', 'unselected-pressed-icon-color',
    'selected-focus-state-layer-color', 'selected-hover-state-layer-color',
    'selected-pressed-state-layer-color', 'unselected-focus-state-layer-color',
    'unselected-hover-state-layer-color', 'unselected-pressed-state-layer-color')
_TYPOGRAPHY = ('-moz-osx-font-smoothing', '-webkit-font-smoothing', 'font-family',
    'font-size', 'line-height', 'font-weight', 'letter-spacing', 'text-decoration', 'text-transform')
_VARIANTS = (('text', 'mat-mdc-button'), ('filled', 'mat-mdc-unelevated-button'),
             ('protected', 'mat-mdc-raised-button'), ('outlined', 'mat-mdc-outlined-button'))
_GEOMETRY = {0: ('0px 0px 0px 0px',) * 3,
    2: ('0px 3px 1px -2px', '0px 2px 2px 0px', '0px 1px 5px 0px'),
    4: ('0px 2px 4px -1px', '0px 4px 5px 0px', '0px 1px 10px 0px'),
    8: ('0px 5px 5px -3px', '0px 8px 10px 1px', '0px 3px 14px 2px')}
# JS \s, rather than Python's larger Unicode whitespace set.
_SPACE = '\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff'
_RULE = re.compile(r'([^{}]+)\{([^{}]*)\}')
_FAILURES = (AssertionError, KeyError, TypeError, ValueError, UnicodeError)


def _fields(value, keys):
    assert type(value) is dict and all(type(key) is str for key in dict.keys(value))
    return tuple(dict.__getitem__(value, key) for key in keys)


def _measurement(value):
    css, digest, size = _fields(value, ('css', 'css_sha256', 'css_bytes'))
    assert type(css) is str and type(digest) is str and type(size) is int
    assert digest == hashlib.sha256(css.encode()).hexdigest() and size == len(css.encode())
    return css


def _shadow(level):
    return ', '.join(value + ' rgba(0, 0, 0, ' + opacity + ')'
                     for value, opacity in zip(_GEOMETRY[level], ('0.2', '0.14', '0.12')))


def _fallback(value):
    while re.match(r'^var\(--mdc-(?:typography|theme)-', value):
        comma = value.find(', ')
        assert comma > 0 and value.endswith(')')
        value = value[comma + 2:-1]
    return value


def _parse(css):
    assert type(css) is str and css and '\r' not in css
    rules, cursor = [], 0
    for match in _RULE.finditer(css):
        assert match.start() == cursor
        head, body = match[1], match[2]
        leading = len(head) - len(head.lstrip(_SPACE))
        header = head[leading:]
        assert header.endswith(' ') and body.startswith('\n') and body.endswith('\n')
        rows = []
        for line in body[1:-1].split('\n'):
            item = re.fullmatch(r'  ([a-z-]+): ([^;\r\n{}]+);', line)
            assert item
            rows.append((item[1], item[2]))
        assert len({key for key, _ in rows}) == len(rows)
        rules.append(dict(selector=header[:-1], head_start=match.start() + leading,
                          body_start=match.start() + len(head) + 1, close=match.end() - 1,
                          end=match.end(), rows=rows, values=dict(rows)))
        cursor = match.end()
    assert cursor == len(css)
    return rules


def _build(css, scope, family, dimension):
    rules, ops, cursor = _parse(css), [], 0
    def take(selector, keys=None):
        nonlocal cursor
        assert cursor < len(rules)
        row = rules[cursor]
        cursor += 1
        assert row['selector'] == selector
        if keys is not None:
            assert [key for key, _ in row['rows']] == list(keys)
        return row
    def decls(pairs): return ''.join('  ' + key + ': ' + value + ';\n' for key, value in pairs)
    def rule(selector, pairs): return selector + ' {\n' + decls(pairs) + '}'
    def public(prefix, pairs): return [('--mat-' + prefix + '-' + key, value) for key, value in pairs]
    def append(row, pairs): ops.append((row['close'], decls(pairs)))
    def after(row, text): ops.append((row['end'], '\n' + text))
    if family == 'checkbox':
        if dimension in ('color', 'theme'):
            colors = [take(scope + suffix, ['--mdc-checkbox-' + key for key in _CHECKBOX])
                      for suffix in ('', ' .mat-mdc-checkbox.mat-primary', ' .mat-mdc-checkbox.mat-warn')]
            label = take(scope + ' .mat-mdc-checkbox .mdc-form-field', ['color'])
            disabled = take(scope + ' .mat-mdc-checkbox.mat-mdc-checkbox-disabled label', ['color'])
            for row in colors:
                values = row['values']
                assert values['--mdc-checkbox-unselected-pressed-icon-color'] == values['--mdc-checkbox-unselected-icon-color']
                pairs = [(key, values['--mdc-checkbox-' + key]) for key in _CHECKBOX
                         if key != 'unselected-pressed-icon-color']
                pairs += [('disabled-selected-checkmark-color', '#fff')]
                pairs += [(state + '-' + event + '-state-layer-opacity', opacity)
                          for state in ('selected', 'unselected')
                          for event, opacity in (('focus', '0.16'), ('hover', '0.04'), ('pressed', '0.16'))]
                pairs += [('disabled-label-color', disabled['values']['color'])]
                append(row, public('checkbox', pairs))
            after(label, rule(scope + ' .mat-mdc-checkbox', public('checkbox',
                  [('label-text-color', _fallback(label['values']['color']))])))
        if dimension in ('density', 'theme'):
            density = take(scope, ['--mdc-checkbox-state-layer-size'])
            unsupported = cursor < len(rules) and rules[cursor]['selector'] == scope + ' .mat-mdc-checkbox-touch-target'
            if unsupported:
                assert take(scope + ' .mat-mdc-checkbox-touch-target', ['display'])['values']['display'] == 'none'
            append(density, public('checkbox', [('state-layer-size', density['values']['--mdc-checkbox-state-layer-size']),
                   ('touch-target-size', '48px'), ('touch-target-display', 'block')]
                   + ([('touch-target-display', 'none')] if unsupported else [])))
        if dimension in ('typography', 'theme'):
            row = take(scope + ' .mat-mdc-checkbox .mdc-form-field', _TYPOGRAPHY)
            after(row, rule(scope + ' .mat-mdc-checkbox', public('checkbox',
                [('label-text-' + key, _fallback(row['values'][old])) for key, old in
                 (('font', 'font-family'), ('line-height', 'line-height'), ('size', 'font-size'),
                  ('tracking', 'letter-spacing'), ('weight', 'font-weight'))])))
    else:
        assert family == 'button'
        if dimension in ('color', 'theme'):
            for kind, cls in _VARIANTS:
                base, prefix = scope + ' .' + cls, '--mdc-' + kind + '-button-'
                outline = take(base, [prefix + 'outline-color']) if kind == 'outlined' else None
                roles = [take(base + '.' + role, [prefix + key for key in
                         (('container-color', 'label-text-color') if kind in ('filled', 'protected') else ('label-text-color',))])
                         for role in ('mat-unthemed', 'mat-primary', 'mat-accent', 'mat-warn')]
                disabled_keys = (['disabled-label-text-color', 'label-text-color'] if kind == 'text' else
                    ['label-text-color', 'disabled-label-text-color', 'outline-color', 'disabled-outline-color'] if kind == 'outlined' else
                    ['disabled-container-color', 'disabled-label-text-color', 'container-color', 'label-text-color']
                    + (['container-elevation'] if kind == 'protected' else []))
                disabled = take(base + '[disabled][disabled]', [prefix + key for key in disabled_keys])
                common = [(kind + '-disabled-label-text-color', disabled['values'][prefix + 'disabled-label-text-color'])]
                if kind in ('filled', 'protected'):
                    common += [(kind + '-disabled-container-color', disabled['values'][prefix + 'disabled-container-color'])]
                if kind == 'protected':
                    common += [(kind + '-' + key, _shadow(level)) for key, level in
                        (('container-elevation-shadow', 2), ('hover-container-elevation-shadow', 4),
                         ('focus-container-elevation-shadow', 4), ('pressed-container-elevation-shadow', 8),
                         ('disabled-container-elevation-shadow', 0))]
                if kind == 'outlined':
                    color = outline['values'][prefix + 'outline-color']
                    common += [('outlined-outline-color', color), ('outlined-disabled-outline-color', color)]
                    ops.append((outline['body_start'] + 1, decls(public('button', common))))
                else:
                    ops.append((roles[0]['head_start'], rule(base, public('button', common)) + '\n'))
                for row in roles:
                    append(row, public('button', [(kind + '-' + key[len(prefix):], value) for key, value in row['rows']]))
                append(disabled, public('button', [(kind + '-' + ('container-elevation-shadow' if key == prefix + 'container-elevation' else key[len(prefix):]),
                     _shadow(0) if key == prefix + 'container-elevation' else value) for key, value in disabled['rows']]
                     + ([('protected-disabled-container-elevation-shadow', _shadow(0))] if kind == 'protected' else [])))
            for group in ((_VARIANTS[0], _VARIANTS[3]), (_VARIANTS[2], _VARIANTS[1])):
                def sels(suffix): return ', '.join(scope + ' .' + cls + suffix for _, cls in group)
                hover = take(sels(':hover .mat-mdc-button-persistent-ripple::before'), ['opacity'])
                focus = take(', '.join(scope + ' .' + cls + state + ' .mat-mdc-button-persistent-ripple::before'
                             for _, cls in group for state in ('.cdk-program-focused', '.cdk-keyboard-focused')), ['opacity'])
                press = take(sels(':active .mat-mdc-button-persistent-ripple::before'), ['opacity'])
                originals = [take(sels(role), ['--mat-mdc-button-persistent-ripple-color', '--mat-mdc-button-ripple-color'])
                             for role in ('', '.mat-primary', '.mat-accent', '.mat-warn')]
                additions = [rule(row['selector'], public('button', [(kind + '-' + key, value)
                    for kind, _ in group for key, value in
                    (('state-layer-color', row['values']['--mat-mdc-button-persistent-ripple-color']),
                     ('disabled-state-layer-color', row['values']['--mat-mdc-button-persistent-ripple-color']),
                     ('ripple-color', row['values']['--mat-mdc-button-ripple-color']),
                     ('hover-state-layer-opacity', hover['values']['opacity']),
                     ('focus-state-layer-opacity', focus['values']['opacity']),
                     ('pressed-state-layer-opacity', press['values']['opacity']))])) for row in originals]
                after(originals[-1], '\n'.join(additions))
        if dimension in ('density', 'theme'):
            ordered = [scope + ' .' + cls + '.mat-mdc-button-base'
                       for _, cls in (_VARIANTS[0], _VARIANTS[2], _VARIANTS[1], _VARIANTS[3])]
            density = take(',\n'.join(ordered))
            reset = len(density['rows']) != 1
            assert [key for key, _ in density['rows']] == (['height', 'margin-top', 'margin-bottom'] if reset else ['height'])
            last = density
            if reset:
                last = take(',\n'.join(s + ' .mdc-button__touch' for s in ordered), ['height'])
                assert last['values']['height'] == '100%'
            touch_selector = ',\n'.join(s + ' .mat-mdc-button-touch-target' for s in ordered)
            unsupported = cursor < len(rules) and rules[cursor]['selector'] == touch_selector
            if unsupported:
                last = take(touch_selector, ['display'])
                assert last['values']['display'] == 'none'
            def pairs(display): return [(kind + '-' + key, value) for kind, _ in _VARIANTS for key, value in
                (('container-height', density['values']['height']), ('touch-target-size', '48px'), ('touch-target-display', display))]
            tokens = public('button', pairs('block') + (pairs('none') if unsupported else []))
            if reset: after(last, rule(',\n'.join(ordered), tokens))
            else: append(density, tokens)
        if dimension in ('typography', 'theme'):
            row = take(scope + ' .mdc-button', _TYPOGRAPHY)
            after(row, rule(scope, public('button', [(kind + '-label-text-' + key, _fallback(row['values'][old]))
                 for kind, _ in _VARIANTS for key, old in (('font', 'font-family'), ('size', 'font-size'),
                 ('tracking', 'letter-spacing'), ('weight', 'font-weight'), ('transform', 'text-transform'))])))
    assert cursor == len(rules)
    # Python's stable sort preserves equal-position insertion order just like JS.
    for position, text in sorted(ops, key=lambda op: -op[0]):
        css = css[:position] + text + css[position:]
    return css


def ordinary_checkbox_button_expected_css(args):
    try:
        case_id, css = _fields(args, ('caseId', 'originalCss'))
        assert type(case_id) is str and case_id in ORDINARY_CHECKBOX_BUTTON_CASES
        match = re.fullmatch(r'(mixin-css|mixin-argument)/(checkbox|button)-(color|typography|density|theme)(?:/[^/]+)?', case_id)
        assert match
        return _build(css, '.sass-api-probe' if match[1] == 'mixin-css' else '.sass-argument-probe', match[2], match[3])
    except _FAILURES:
        return None


def ordinary_checkbox_button_results_match(args):
    try:
        case_id, original, actual = _fields(args, ('caseId', 'original', 'actual'))
        before, after = _measurement(original), _measurement(actual)
        expected = ordinary_checkbox_button_expected_css(dict(caseId=case_id, originalCss=before))
        return expected is not None and after == expected
    except _FAILURES:
        return False


def _leaf_rules(css):
    out = []
    for match in _RULE.finditer(css):
        head = match[1]
        leading = len(head) - len(head.lstrip(_SPACE))
        header = head[leading:]
        if header.endswith(' '):
            out.append(dict(start=match.start() + leading, end=match.end(), header=header[:-1]))
    return out


def _map_headers(css, old, new):
    cursor, out = 0, ''
    for row in _leaf_rules(css):
        assert all(piece == old or piece.startswith(old + ' ') for piece in re.split(r',\n|, ', row['header']))
        header = row['header'].replace(old, new)
        out += css[cursor:row['start']] + header + css[row['start'] + len(row['header']):row['end']]
        cursor = row['end']
    return out + css[cursor:]


def _legacy_transform(case_id, css):
    assert type(case_id) is str and case_id in _LEGACY_PLANS and type(css) is str
    phases = _LEGACY_PLANS[case_id]
    scope = '.sass-api-probe' if case_id.startswith('mixin-css/') else '.sass-argument-probe'
    nested = scope + ' .mat-datepicker-content'
    rules, selected = _leaf_rules(css), []
    def belongs(row):
        for selector in re.split(r',\n|, ', row['header']):
            if selector == nested + ' .mdc-button': continue
            found = False
            for _, cls in _VARIANTS:
                prefix = nested + ' .' + cls
                if selector.startswith(prefix):
                    suffix = selector[len(prefix):]
                    if not suffix or suffix[0] in '.:[' + _SPACE:
                        found = True
                        break
            if not found: return False
        return True
    index = 0
    while index < len(rules):
        if belongs(rules[index]):
            group = [rules[index]]
            while index + 1 < len(rules) and belongs(rules[index + 1]):
                index += 1
                group.append(rules[index])
            selected.append(group)
        index += 1
    assert len(selected) == len(phases)
    replacements = []
    for group, dimension in zip(selected, phases):
        start, end = group[0]['start'], group[-1]['end']
        root_before = _map_headers(css[start:end], nested, scope)
        root_id = ('mixin-css/' if scope == '.sass-api-probe' else 'mixin-argument/') + 'button-' + dimension + ('' if scope == '.sass-api-probe' else '/custom-full-theme')
        expected = ordinary_checkbox_button_expected_css(dict(caseId=root_id, originalCss=root_before))
        assert type(expected) is str
        replacements.append((start, end, _map_headers(expected, scope, nested)))
    for start, end, expected in reversed(replacements):
        css = css[:start] + expected + css[end:]
    return css


def legacy_datepicker_button_expected_css(args):
    try:
        case_id, css = _fields(args, ('caseId', 'originalCss'))
        return _legacy_transform(case_id, css)
    except _FAILURES:
        return None


def legacy_datepicker_button_results_match(args):
    try:
        case_id, original, actual = _fields(args, ('caseId', 'original', 'actual'))
        before, after = _measurement(original), _measurement(actual)
        return after == _legacy_transform(case_id, before)
    except _FAILURES:
        return False


# Exact JS-name aliases ease focused cross-language parity without a second model.
ordinaryCheckboxButtonExpectedCss = ordinary_checkbox_button_expected_css
ordinaryCheckboxButtonResultsMatch = ordinary_checkbox_button_results_match
legacyDatepickerButtonExpectedCss = legacy_datepicker_button_expected_css
legacyDatepickerButtonResultsMatch = legacy_datepicker_button_results_match
