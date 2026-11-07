# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite Material-16 Stepper values inside authenticated Sass expected models."""
import re

_SHAPES=('header-focus-state-layer-shape','header-hover-state-layer-shape')
_COLORS=('header-hover-state-layer-color','header-focus-state-layer-color',
         'header-error-state-label-text-color','header-error-state-icon-foreground-color')

def historical_stepper_peer_css(peer_css,historical_css,line,has_color):
    """Rewrite one Stepper peer member after its caller checks both source capsules."""
    if line not in ('main','21.x') or type(peer_css) is not str or type(historical_css) is not str or type(has_color) is not bool:
        return None
    # Main's current companion addition uses the independently measured peer.
    if line == 'main': return peer_css
    result=peer_css
    for name in _SHAPES+(_COLORS if has_color else ()):
        property='--mat-stepper-'+name
        pattern=re.compile(r'^  '+re.escape(property)+r': ([^;\n]+);$',re.M)
        if len(pattern.findall(result))!=1:return None
        if name in _SHAPES:
            value='0'
        else:
            found=pattern.findall(historical_css)
            if len(found)!=1:return None
            value=found[0]
        result=pattern.sub('  '+property+': '+value+';',result)
    return result
