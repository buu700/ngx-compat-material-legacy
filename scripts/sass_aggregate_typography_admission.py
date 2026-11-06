"""Four typography aggregates: complete historical CSS and finite public additions."""
import hashlib
import json
import re
from pathlib import Path
from sass_stepper_historical_model import historical_stepper_peer_css
from sass_current_companion_admission import peer_measurement_ok
_ROOT=Path(__file__).resolve().parents[1]
_CATALOG=json.loads((_ROOT/'fixtures/sass/aggregate-typography-contracts.json').read_bytes())
AGGREGATE_TYPOGRAPHY_CASES=_CATALOG['cases']
_NAMES=['all-component-typographies','all-legacy-component-typographies']
_IDS={f'mixin-argument/{name}/{variant}' for name in _NAMES for variant in ['custom-full-theme','raw-typography-config']}
_FAMILIES=['badge','bottom-sheet','button-toggle','datepicker','divider','expansion','grid-list','icon','sidenav','stepper','sort','toolbar','tree']
_sha=lambda s:hashlib.sha256(s.encode()).hexdigest()
_oracle_bytes=(_ROOT/'compatibility/rc/oracles/material-16.2.14-sass-api.json').read_bytes()
_oracle=json.loads(_oracle_bytes)
if (_CATALOG['schema_version']!=1 or set(AGGREGATE_TYPOGRAPHY_CASES)!=_IDS
    or hashlib.sha256(_oracle_bytes).hexdigest()!=_CATALOG['original_membership']['oracle_sha256']
    or any(_oracle['members']['mixins'][n]['aggregate']!=_CATALOG['original_membership']['aggregates'][n] for n in _NAMES)):
    raise ValueError('finite typography aggregate scope changed')

def _members(css):
    result={}
    for family in _FAMILIES:
        start=f'/*!__closeout_{family}_begin__*/';end=f'/*!__closeout_{family}_end__*/'
        if css.count(start)!=1 or css.count(end)!=1:return None
        result[family]=css.split(start)[1].split(end)[0].strip()
    return result

def _parent(*members):
    opening='.sass-argument-probe {\n'
    if any(not css.startswith(opening) or not css.endswith('\n}') or css.count(opening)!=1 for css in members):return None
    return opening+'\n'.join(css[len(opening):-2] for css in members)+'\n}'

def aggregate_typography_expected_css(body):
    try:
        entry=AGGREGATE_TYPOGRAPHY_CASES[body['case_id']];profile=_CATALOG['profiles'][entry['profile']]
        original=body['expected'];contract=body['current_companion'];peer=contract['peer'];line=body['line'];floor=profile['peers'][line]
        if (body.get('comparison')!='current-companion-contract' or contract['classification']!='conforming-current-companion'
            or contract['contract']!='historical-typography-aggregate-with-qualified-members'):return None
        if (original['css_sha256']!=entry['original_sha256'] or _sha(original['css'])!=entry['original_sha256'] or original['css_bytes']!=len(original['css'].encode())
            or not peer_measurement_ok(peer,line,floor['program_sha256'],_CATALOG['sources'][line]) or peer['css_sha256']!=floor['css_sha256']):return None
        p=_members(peer['css']);o={f:m['css'] for f,m in profile['originals'].items()}
        if p is None or any(f not in o or _sha(o[f])!=profile['originals'][f]['css_sha256'] or len(o[f].encode())!=profile['originals'][f]['css_bytes'] for f in _FAMILIES):return None
        p['stepper']=historical_stepper_peer_css(p['stepper'],o['stepper'],line,False)
        if p['stepper'] is None:return None
        if (p['grid-list']!=o['grid-list'] or p['toolbar']!=o['toolbar'] or p['icon']!='' or p['sort']!=''
            or any(o[f]!='' for f in ['divider','icon','sidenav','sort'])):return None
        order=['bottom-sheet','button-toggle','datepicker','expansion','grid-list','stepper','toolbar','tree']
        css=original['css']
        if any(not o[f] or css.count(o[f])!=1 for f in ['badge']+order):return None
        badge=css.index(o['badge']);bottom=css.index(o['bottom-sheet']);tail='\n\n'.join(o[f] for f in order)
        if css[bottom:bottom+len(tail)]!=tail or bottom<badge+len(o['badge']):return None
        middle=css[badge+len(o['badge']):bottom];suffix=css[bottom+len(tail):]
        if not middle.startswith('\n\n') or not suffix.startswith('\n'):return None
        added=lambda f:o[f]+'\n\n'+p[f]
        button=_parent(p['button-toggle'],p['divider']);expansion=_parent(p['expansion'],p['grid-list'],p['sidenav']);stepper=_parent(p['stepper'],p['toolbar'])
        if any(v is None for v in [button,expansion,stepper]):return None
        tree=re.sub(r'^  (font-weight|font-size): ([^;\n{}]+);$',
            lambda m:'  '+m[1]+': var(--mat-tree-node-text-'+('weight' if m[1]=='font-weight' else 'size')+', '+m[2]+');',o['tree'],flags=re.M)+'\n'+p['tree']
        # Compose only the three current parent declaration boundaries, keeping
        # exact hierarchy/control CSS and original fallback/font semantics.
        pieces=[added('bottom-sheet'),o['button-toggle']+'\n\n'+button,added('datepicker'),o['expansion']+'\n\n'+expansion,o['stepper']+'\n\n'+stepper,tree]
        return css[:badge]+added('badge')+middle[1:]+'\n'.join(pieces)+suffix
    except (KeyError,TypeError,ValueError,AttributeError):return None

def aggregate_typography_results_match(body):
    expected=aggregate_typography_expected_css(body);actual=body.get('actual') or {}
    try:
        return expected is not None and actual['css']==expected and actual['css_sha256']==_sha(actual['css']) and actual['css_bytes']==len(actual['css'].encode())
    except (KeyError,TypeError,ValueError,AttributeError):return False
