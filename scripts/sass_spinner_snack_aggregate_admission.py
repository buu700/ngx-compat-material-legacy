"""Finite expected-model composition; this helper grants no artifact admission.

Copyright Google LLC All Rights Reserved.
Copyright (c) 2026 Ryan Lester.
Use of this source code is governed by the MIT license in LICENSE.
"""
import re
from sass_spinner_snack_bridge_admission import spinner_snack_positioned_token_css

SPINNER_SNACK_AGGREGATE_CASES = (
    'mixin-css/all-component-colors',
    'mixin-css/all-component-themes',
    'mixin-css/all-component-typographies',
    *('mixin-argument/' + case for case in (
        'all-component-colors/custom-full-theme',
        'all-component-colors/raw-color-config',
        'all-component-themes/custom-full-theme',
        'all-component-themes/custom-dark-theme',
        'all-component-typographies/custom-full-theme',
        'all-component-typographies/raw-typography-config',
    )),
)


def insert_spinner_snack_into_aggregate_model(*, case_id, css):
    """Caller authenticates all prior expected CSS; candidate bytes never enter."""
    if case_id not in SPINNER_SNACK_AGGREGATE_CASES or not isinstance(css, str):
        return None
    scope = '.sass-api-probe' if case_id.startswith('mixin-css/') else '.sass-argument-probe'
    dimension = 'color' if 'all-component-colors' in case_id else 'theme' if 'all-component-themes' in case_id else 'typography'
    new_token = r'--mat-(?:progress-spinner-active-indicator-color|snack-bar-(?:container-color|supporting-text-(?:color|font|line-height|size|weight)))\s*:'
    if re.search(new_token, css):
        return None
    families = [] if dimension == 'typography' else [('progress-spinner', 'color', 3)]
    families.append(('snack-bar', dimension, 2 if dimension == 'theme' else 1))
    result = css
    for family, kind, count in families:
        selector = scope + ' .mat-mdc-' + ('progress-spinner' if family == 'progress-spinner' else 'snack-bar-container')
        variant = r'(?:\.mat-(?:accent|warn))?' if family == 'progress-spinner' else ''
        pattern = '^' + re.escape(selector) + variant + r' \{\n[^{}]*\n\}'
        blocks = re.findall(pattern, result, flags=re.M)
        original = '\n'.join(blocks)
        if len(blocks) != count or result.count(original) != 1:
            return None
        expected = spinner_snack_positioned_token_css(family=family, dimension=kind, original_css=original)
        if expected is None:
            return None
        result = result.replace(original, expected, 1)
    return result
