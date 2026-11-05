# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Pure fifth-module expected CSS; callers authenticate the complete prior model."""
import re
from sass_spinner_snack_aggregate_admission import SPINNER_SNACK_AGGREGATE_CASES

CARD_AGGREGATE_CASES = tuple(SPINNER_SNACK_AGGREGATE_CASES)
_OLD = ['--mdc-elevated-card-container-color', '--mdc-elevated-card-container-elevation', '--mdc-outlined-card-container-color', '--mdc-outlined-card-outline-color', '--mdc-outlined-card-container-elevation', '--mat-card-subtitle-text-color']
_NEW = ['--mat-card-elevated-container-color', '--mat-card-elevated-container-elevation', '--mat-card-outlined-container-color', '--mat-card-outlined-container-elevation', '--mat-card-outlined-outline-color']
_TYPE = ['--mat-card-' + key for key in ['title-text-font', 'title-text-line-height', 'title-text-size', 'title-text-tracking', 'title-text-weight', 'subtitle-text-font', 'subtitle-text-line-height', 'subtitle-text-size', 'subtitle-text-tracking', 'subtitle-text-weight']]

def _block(text, selector, keys):
    lines = text.split('\n')
    assert len(lines) == len(keys) + 2 and lines[0] == selector + ' {' and lines[-1] == '}'
    values = []
    for key, line in zip(keys, lines[1:-1]):
        prefix = '  ' + key + ': '
        assert line.startswith(prefix) and line.endswith(';')
        value = line[len(prefix):-1]
        assert value and not re.search(r'[;\n{}]', value)
        values.append(value)
    return values

def insert_card_into_aggregate_model(*, case_id, css):
    """Candidate CSS never enters this function. Preserve all surrounding bytes."""
    try:
        assert type(case_id) is str and case_id in CARD_AGGREGATE_CASES and type(css) is str and css and '\r' not in css
        selector = ('.sass-api-probe' if case_id.startswith('mixin-css/') else '.sass-argument-probe') + ' .mat-mdc-card'
        dimension = 'typography' if 'all-component-typographies' in case_id else 'theme' if 'all-component-themes' in case_id else 'color'
        matches = list(re.finditer('^' + re.escape(selector) + r'(?=[.#:\[\s]|$)[^{}]* \{\n[^{}]*\n\}', css, re.M))
        assert len(matches) == (2 if dimension == 'theme' else 1)
        # Every owned selector must start one exact modeled block.
        owned = list(re.finditer(re.escape(selector) + r'(?=[.#:\[\s,{]|$)', css))
        assert [m.start() for m in owned] == [m.start() for m in matches]
        blocks = [m[0] for m in matches]
        original = '\n'.join(blocks)
        assert css.count(original) == 1
        if dimension == 'typography':
            _block(original, selector, _TYPE)
            return css
        values = _block(blocks[0], selector, _OLD)
        assert values[0] == values[2]
        if dimension == 'theme':
            _block(blocks[1], selector, _TYPE)
        lines = blocks[0].split('\n')
        lines[-2:-2] = ['  ' + key + ': ' + value + ';' for key, value in zip(_NEW, [values[0], values[1], values[2], values[4], values[3]])]
        blocks[0] = '\n'.join(lines)
        base = selector + ' {\n  --mat-card-elevated-container-shape: 4px;\n  --mat-card-outlined-container-shape: 4px;\n  --mat-card-outlined-outline-width: 1px;\n}'
        start = matches[0].start()
        return css[:start] + base + '\n' + '\n'.join(blocks) + css[start + len(original):]
    except (AssertionError, KeyError, TypeError, ValueError):
        return None
