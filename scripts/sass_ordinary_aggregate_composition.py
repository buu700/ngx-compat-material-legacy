# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite expected-only composition; callers authenticate input and peer first."""
import re
from sass_ordinary_control_css import ordinary_checkbox_button_expected_css
_IDS={'mixin-css/all-component-densities','mixin-argument/all-component-densities/custom-full-theme','mixin-argument/all-component-densities/raw-density-config'}
_FAIL=(AssertionError,ValueError,TypeError,KeyError,IndexError,AttributeError)
def _fields(args):
    assert type(args) is dict and set(args)=={'caseId','css'}
    case,css=args['caseId'],args['css'];assert type(case) is str and type(css) is str and css and '\r' not in css
    return case,css
def _rules(css):
    out=[]
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}',css):
        lead=len(m[1])-len(m[1].lstrip());header=m[1][lead:];assert header.endswith(' ')
        out.append(dict(start=m.start()+lead,end=m.end(),header=header[:-1],body=m[2]))
    return out
def _unique(rows,predicate):
    found=[i for i,r in enumerate(rows) if predicate(r)];assert len(found)==1;return found[0]
def _replace(css,edits):
    for start,end,value in sorted(edits,reverse=True):css=css[:start]+value+css[end:]
    return css
def compose_ordinary_aggregate_density(args):
    if not __debug__:return None
    try:
        case,css=_fields(args);assert case in _IDS;arg=case.startswith('mixin-argument/');scope='.sass-argument-probe' if arg else '.sass-api-probe';rs=_rules(css)
        ck=_unique(rs,lambda r:r['header']==scope and re.fullmatch(r'\n  --mdc-checkbox-state-layer-size: [^;\n]+;\n',r['body']))
        nxt=ck+1<len(rs) and rs[ck+1]['header']==scope+' .mat-mdc-checkbox-touch-target'
        bt=_unique(rs,lambda r:r['header'].startswith(scope+' .mat-mdc-button.mat-mdc-button-base,\n') and r['header'].endswith(scope+' .mat-mdc-outlined-button.mat-mdc-button-base'))
        reset=bt+1<len(rs) and '.mdc-button__touch' in rs[bt+1]['header'];at=bt+1+int(reset);touch=at<len(rs) and '.mat-mdc-button-touch-target' in rs[at]['header'];assert ck<bt
        edits=[]
        for first,last,family in [(ck,ck+int(nxt),'checkbox'),(bt,bt+int(reset)+int(touch),'button')]:
            start,end=rs[first]['start'],rs[last]['end'];fragment=css[start:end];assert css.count(fragment)==1
            child=('mixin-argument/' if arg else 'mixin-css/')+family+'-density'+('/custom-full-theme' if arg else '')
            value=ordinary_checkbox_button_expected_css(dict(caseId=child,originalCss=fragment));assert type(value) is str;edits.append((start,end,value))
        return _replace(css,edits)
    except _FAIL:return None
