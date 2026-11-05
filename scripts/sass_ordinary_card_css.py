# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact card12 whole-CSS expectation. Pure data/model only, no source admission."""
import hashlib
import json
from pathlib import Path
import re

_ROOT = Path(__file__).resolve().parents[1]
_INPUT = 'compatibility/rc/ordinary-card-public-bridge-original-cases-v1.json'
_PINS = {
    _INPUT: '59e47c924f0f541b7b262a9ee31f6e55bc4160c1c420f683247a1703be470bbf',
    'compatibility/rc/ordinary-card-public-bridge-model-v1.mjs': '0286969a007029a3628d8a56fb17c0ee2bbfecec735abdf5d95911ac7c709a83',
    'compatibility/rc/ordinary-card-public-bridge-model-v2.mjs': '171a32edcc51d651173d52840da6a4cdcdf4bb4280b3e717ab96419714f013ad',
}

def _hash(value):
    return hashlib.sha256(value.encode() if type(value) is str else value).hexdigest()

for _path, _sha in _PINS.items():
    assert _hash((_ROOT / _path).read_bytes()) == _sha
_PACKET = json.loads((_ROOT / _INPUT).read_bytes())
ORDINARY_CARD_CASES = tuple(row['case_id'] for row in _PACKET['cases'] if row['case_id'].startswith(('mixin-css/', 'mixin-argument/')))
assert len(ORDINARY_CARD_CASES) == len(set(ORDINARY_CARD_CASES)) == 12
_CASES = {row['case_id']: row for row in _PACKET['cases'] if row['case_id'] in ORDINARY_CARD_CASES}
_OLD_COLOR = ['--mdc-elevated-card-container-color', '--mdc-elevated-card-container-elevation', '--mdc-outlined-card-container-color', '--mdc-outlined-card-outline-color', '--mdc-outlined-card-container-elevation']
_PUBLIC_COLOR = ['--mat-card-elevated-container-color', '--mat-card-elevated-container-elevation', '--mat-card-outlined-container-color', '--mat-card-outlined-container-elevation', '--mat-card-outlined-outline-color']
_TYPE_KEYS = ['--mat-card-' + key for key in ['title-text-font', 'title-text-line-height', 'title-text-size', 'title-text-tracking', 'title-text-weight', 'subtitle-text-font', 'subtitle-text-line-height', 'subtitle-text-size', 'subtitle-text-tracking', 'subtitle-text-weight']]

def _plain(value):
    if value is None or type(value) in (str, bool):
        return value
    if type(value) is int:
        assert abs(value) <= 9007199254740991
        return value
    if type(value) is list:
        return [_plain(row) for row in value]
    assert type(value) is dict and all(type(key) is str for key in value)
    return {key: _plain(item) for key, item in value.items()}

def _block(text, selector, keys):
    lines = text.split('\n')
    assert len(lines) == len(keys) + 2 and lines[0] == selector + ' {' and lines[-1] == '}'
    values = []
    for index, key in enumerate(keys):
        prefix = '  ' + key + ': '
        line = lines[index + 1]
        assert line.startswith(prefix) and line.endswith(';')
        value = line[len(prefix):-1]
        assert value and not re.search(r'[;\n{}]', value)
        values.append(value)
    return values

def ordinary_card_expected_css(args):
    """Exact12-case original-image→expected-image function; invalid input returns None."""
    try:
        value = _plain(args)
        assert set(value) == {'caseId', 'originalCss'}
        row = _CASES[value['caseId']]
        original = value['originalCss']
        assert type(original) is str and original == row['original']['css']
        assert _hash(original) == row['original']['css_sha256'] and len(original.encode()) == row['original']['css_bytes']
        dimension, selector = row['dimension'], row['selector']
        assert selector in ('.sass-api-probe .mat-mdc-card', '.sass-argument-probe .mat-mdc-card')
        if dimension == 'density':
            assert original == ''
            return original
        if dimension == 'typography':
            _block(original, selector, _TYPE_KEYS)
            return original
        assert dimension in ('color', 'theme')
        if dimension == 'theme':
            separator = '}\n' + selector + ' {'
            parts = original.split(separator)
            assert len(parts) == 2
            blocks = [parts[0] + '}', selector + ' {' + parts[1]]
            _block(blocks[1], selector, _TYPE_KEYS)
        else:
            blocks = [original]
        values = _block(blocks[0], selector, _OLD_COLOR + ['--mat-card-subtitle-text-color'])
        assert values[0] == values[2]
        mapped = [values[0], values[1], values[2], values[4], values[3]]
        lines = blocks[0].split('\n')
        lines[-2:-2] = ['  ' + key + ': ' + val + ';' for key, val in zip(_PUBLIC_COLOR, mapped)]
        blocks[0] = '\n'.join(lines)
        color = '\n'.join(blocks)
        if dimension == 'color':
            return color
        base = selector + ' {\n  --mat-card-elevated-container-shape: 4px;\n  --mat-card-outlined-container-shape: 4px;\n  --mat-card-outlined-outline-width: 1px;\n}'
        return base + '\n' + color
    except (AssertionError, KeyError, TypeError, ValueError, RecursionError):
        return None

def ordinary_card_results_match(args):
    try:
        value = _plain(args)
        assert set(value) == {'caseId', 'original', 'actual'}
        original, actual = value['original'], value['actual']
        expected = ordinary_card_expected_css(dict(caseId=value['caseId'], originalCss=original['css']))
        return (expected is not None and original['css_sha256'] == _hash(original['css'])
                and type(original['css_bytes']) is int and original['css_bytes'] == len(original['css'].encode())
                and actual['css'] == expected and actual['css_sha256'] == _hash(expected)
                and type(actual['css_bytes']) is int and actual['css_bytes'] == len(expected.encode()))
    except (AssertionError, KeyError, TypeError, ValueError, RecursionError):
        return False

ordinaryCardExpectedCss = ordinary_card_expected_css
ordinaryCardResultsMatch = ordinary_card_results_match
