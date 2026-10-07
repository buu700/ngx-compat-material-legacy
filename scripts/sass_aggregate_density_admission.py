"""Four density aggregates preserve the complete original prefix and finite tail."""
import hashlib
import json
from pathlib import Path
from sass_current_companion_admission import peer_measurement_ok
from sass_companion_addition_admission import companion_addition_expected_css
from sass_tree_companion_admission import tree_companion_expected_css

_CATALOG=json.loads((Path(__file__).resolve().parents[1]/'fixtures/sass/aggregate-density-contracts.json').read_bytes())
AGGREGATE_DENSITY_CASES=_CATALOG['cases']
MEMBERS=['expansion','stepper','toolbar','tree','button-toggle']
_IDS={f'mixin-argument/{name}/{variant}' for name in ['all-component-densities','private-all-legacy-component-densities'] for variant in ['custom-full-theme','raw-density-config']}
_sha=lambda s:hashlib.sha256(s.encode()).hexdigest()
if (_CATALOG['schema_version']!=1 or set(AGGREGATE_DENSITY_CASES)!=_IDS
    or [m['family'] for m in _CATALOG['members']]!=MEMBERS
    or ''.join(m['css']+m['separator'] for m in _CATALOG['members'])!=_CATALOG['original_tail']
    or _sha(_CATALOG['original_tail'])!='a4a3c6e9000735891f3175e8340e9db6d0cf9f10cad8f4ac15bab24c19ee48a7'):
    raise ValueError('finite aggregate density scope changed')

def aggregate_density_expected_css(body):
    try:
        case=body['case_id'];digest=AGGREGATE_DENSITY_CASES[case];original=body['expected'];line=body['line'];contract=body['current_companion']
        if (body.get('comparison')!='current-companion-contract' or contract['classification']!='conforming-current-companion'
            or contract['contract']!='historical-density-aggregate-with-qualified-tail'):return None
        peers=contract['peers'];tail=_CATALOG['original_tail']
        if (original['css_sha256']!=digest or _sha(original['css'])!=digest or original['css_bytes']!=len(original['css'].encode())
            or not original['css'].endswith(tail) or original['css'].count(tail)!=1 or set(peers)!=set(MEMBERS)
            or any(peers[f]['line']!=line for f in MEMBERS)):return None
        parts=[]
        for member in _CATALOG['members']:
            family=member['family'];css=member['css'];peer=peers[family]
            if family=='toolbar':
                if not peer_measurement_ok(peer,line,_CATALOG['toolbar_program_sha256'],_CATALOG['toolbar_sources'][line]) or peer['css']!=css:return None
                value=css
            else:
                model='current-tree-dimensions-with-original-fallbacks' if family=='tree' else 'original-css-with-current-companion-addition'
                child=dict(case_id=f'mixin-argument/{family}-density/custom-full-theme',line=line,comparison='current-companion-contract',
                    expected=dict(css=css,css_sha256=_sha(css),css_bytes=len(css.encode())),
                    current_companion=dict(classification='conforming-current-companion',contract=model,peer=peer))
                value=tree_companion_expected_css(child) if family=='tree' else companion_addition_expected_css(child)
            if value is None:return None
            parts.append(value)
        # Exact current parent declaration composition at the one adjacent
        # stepper/toolbar boundary; no declaration/rule normalization elsewhere.
        if not parts[2].startswith('.sass-argument-probe {\n') or not parts[1].endswith('\n}'):return None
        joined=parts[1][:-2]+'\n'+parts[2][len('.sass-argument-probe {\n'):]
        return original['css'][:-len(tail)]+'\n'.join([parts[0],joined,parts[3],parts[4]])
    except (KeyError,TypeError,ValueError,AttributeError):return None

def aggregate_density_results_match(body):
    expected=aggregate_density_expected_css(body);actual=body.get('actual') or {}
    try:
        return expected is not None and actual['css']==expected and actual['css_sha256']==_sha(actual['css']) and actual['css_bytes']==len(actual['css'].encode())
    except (KeyError,TypeError,ValueError,AttributeError):return False
