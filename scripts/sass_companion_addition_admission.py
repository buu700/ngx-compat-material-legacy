"""Finite append-only companion scope, authentic original and current peer CSS."""
import hashlib
import json
from pathlib import Path
from sass_stepper_historical_model import historical_stepper_peer_css
from sass_current_companion_admission import peer_measurement_ok

_CATALOG=json.loads((Path(__file__).resolve().parents[1]/'fixtures/sass/companion-addition-contracts.json').read_bytes())
_FAMILIES=['bottom-sheet','button-toggle','divider','expansion','sidenav','stepper']
_SCOPES={**dict.fromkeys(_FAMILIES,['color','typography','density','theme']),'badge':['color','typography','density'],'datepicker':['color','typography'],'toolbar':['color','theme']}
_IDS={f'mixin-argument/{family}-{dimension}/{variant}' for family,dimensions in _SCOPES.items()
      for dimension in dimensions
      for variant in ['custom-full-theme','custom-dark-theme' if dimension=='theme' else f'raw-{dimension}-config']}
if _CATALOG['schema_version']!=1 or set(_CATALOG['cases'])!=_IDS:
    raise ValueError('finite companion addition roster changed')
COMPANION_ADDITION_CASES=_CATALOG['cases']

def companion_addition_expected_css(body):
    try:
        entry=COMPANION_ADDITION_CASES[body['case_id']]
        if body.get('comparison')!='current-companion-contract':return None
        contract=body['current_companion']
        if contract['classification']!='conforming-current-companion' or contract['contract']!='original-css-with-current-companion-addition':return None
        original=body['expected'];peer=contract['peer'];line=body['line'];floor=entry['peers'][line]
        if original['css_sha256']!=entry['original_sha256'] or hashlib.sha256(original['css'].encode()).hexdigest()!=entry['original_sha256'] or original['css_bytes']!=len(original['css'].encode()):return None
        if not peer_measurement_ok(peer,line,floor['program_sha256'],_CATALOG['sources'][line][entry['family']]) or peer['css_sha256']!=floor['css_sha256']:return None
        addition=historical_stepper_peer_css(peer['css'],original['css'],line,'color' in entry['dimensions']) if entry['family']=='stepper' else peer['css']
        if addition is None:return None
        return (original['css']+entry['separator'] if original['css'] else '')+addition
    except (KeyError,TypeError,ValueError,AttributeError):return None

def companion_addition_results_match(body):
    expected=companion_addition_expected_css(body);actual=body.get('actual') or {}
    try:
        return expected is not None and actual['css']==expected and actual['css_sha256']==hashlib.sha256(actual['css'].encode()).hexdigest() and actual['css_bytes']==len(actual['css'].encode())
    except (KeyError,TypeError,ValueError,AttributeError):return False
