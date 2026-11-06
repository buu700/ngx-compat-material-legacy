# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite expected-only 06 composition; caller authenticates all inputs."""
import re
from sass_ordinary_control_css import ordinary_checkbox_button_expected_css

_FAIL=(AssertionError, ValueError, TypeError, KeyError, IndexError, AttributeError)
def _rules(css):
    out=[]
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
        n=len(m[1])-len(m[1].lstrip()); header=m[1][n:]; assert header.endswith(' ')
        out.append((m.start()+n,m.end(),header[:-1]))
    return out

def _map_headers(css, old, new):
    pos=0; out=''
    for start,end,header in _rules(css):
        assert all(s == old or s.startswith(old+' ') for s in re.split(r',\n|, ',header))
        out+=css[pos:start]+header.replace(old,new)+css[start+len(header):end];pos=end
    return out+css[pos:]

def compose_ordered_aggregate_button(args):
    if not __debug__: return None
    try:
        assert type(args) is dict and set(args)=={'caseId','css'}
        case,css=args['caseId'],args['css'];assert type(case) is str and case=='06-aggregate-and-companions' and type(css) is str and css and '\r' not in css
        rows=_rules(css);edits=[]
        for nested,phases in [('.mat-datepicker-content',['color','density','typography']),('.dark-shell .mat-datepicker-content',['color','density'])]:
            classes=['mat-mdc-button','mat-mdc-unelevated-button','mat-mdc-raised-button','mat-mdc-outlined-button']
            def belongs(header):
                def match(s):
                    if s==nested+' .mdc-button':return True
                    for c in classes:
                        prefix=nested+' .'+c
                        if s.startswith(prefix) and re.match(r'^(?:[.:[\s]|$)',s[len(prefix):]):return True
                    return False
                return all(match(s) for s in re.split(r',\n|, ',header))
            groups=[];i=0
            while i<len(rows):
                if belongs(rows[i][2]):
                    group=[rows[i]];i+=1
                    while i<len(rows) and belongs(rows[i][2]):group.append(rows[i]);i+=1
                    groups.append(group)
                else:i+=1
            assert len(groups)==len(phases)
            for g,phase in zip(groups,phases):
                start,end=g[0][0],g[-1][1];fragment=css[start:end];assert css.count(fragment)==1
                child=ordinary_checkbox_button_expected_css({'caseId':'mixin-css/button-'+phase,'originalCss':_map_headers(fragment,nested,'.sass-api-probe')});assert type(child) is str
                value=_map_headers(child,'.sass-api-probe',nested)
                if nested=='.mat-datepicker-content' and phase=='typography':assert css[end:].startswith('\n.mat-option {');value+='\n'
                edits.append((start,end,value))
        assert len(edits)==5 and all(edits[i-1][1]<edits[i][0] for i in range(1,len(edits)))
        for start,end,value in reversed(edits):css=css[:start]+value+css[end:]
        return css
    except _FAIL:return None
