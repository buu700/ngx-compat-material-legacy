"""Four datepicker cases: original controls plus exact public current slots."""
import hashlib
import json
from pathlib import Path
from sass_current_companion_admission import peer_measurement_ok
_CATALOG=json.loads((Path(__file__).resolve().parents[1]/'fixtures/sass/datepicker-controls-contracts.json').read_bytes())
DATEPICKER_CONTROLS_CASES=_CATALOG['cases']
_IDS={'mixin-argument/'+x for x in ['datepicker-density/custom-full-theme','datepicker-density/raw-density-config','datepicker-theme/custom-full-theme','datepicker-theme/custom-dark-theme']}
if _CATALOG['schema_version']!=1 or set(DATEPICKER_CONTROLS_CASES)!=_IDS:raise ValueError('finite datepicker controls scope changed')
ORIGINAL_CALENDAR_DENSITY='.sass-argument-probe .mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base {\n  --mdc-icon-button-state-layer-size: 40px;\n  width: var(--mdc-icon-button-state-layer-size);\n  height: var(--mdc-icon-button-state-layer-size);\n  padding: 8px;\n}\n.sass-argument-probe .mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base .mat-mdc-button-touch-target {\n  display: none;\n}'
CURRENT_CALENDAR_FALLBACKS='.sass-argument-probe .mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base {\n  width: var(--mat-icon-button-state-layer-size, var(--mdc-icon-button-state-layer-size));\n  height: var(--mat-icon-button-state-layer-size, var(--mdc-icon-button-state-layer-size));\n}\n.sass-argument-probe .mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base .mat-mdc-button-touch-target {\n  display: var(--mat-icon-button-touch-target-display, none);\n}'
def datepicker_controls_expected_css(body):
    try:
        entry=DATEPICKER_CONTROLS_CASES[body['case_id']]
        if body.get('comparison')!='current-companion-contract':return None
        contract=body['current_companion']
        if contract['classification']!='conforming-current-companion' or contract['contract']!='historical-calendar-density-with-public-current-slots':return None
        original=body['expected'];peer=contract['peer'];line=body['line'];floor=entry['peers'][line]
        if original['css_sha256']!=entry['original_sha256'] or hashlib.sha256(original['css'].encode()).hexdigest()!=entry['original_sha256'] or original['css_bytes']!=len(original['css'].encode()):return None
        if not peer_measurement_ok(peer,line,floor['program_sha256'],_CATALOG['sources'][line]) or peer['css_sha256']!=floor['css_sha256'] or original['css'].count(ORIGINAL_CALENDAR_DENSITY)!=1:return None
        return original['css'].replace(ORIGINAL_CALENDAR_DENSITY,ORIGINAL_CALENDAR_DENSITY+'\n'+CURRENT_CALENDAR_FALLBACKS,1)+('\n\n' if '/datepicker-theme/' in body['case_id'] else '\n')+peer['css']
    except (KeyError,TypeError,ValueError,AttributeError):return None

def datepicker_controls_results_match(body):
    expected=datepicker_controls_expected_css(body);actual=body.get('actual') or {}
    try:
        return expected is not None and actual['css']==expected and actual['css_sha256']==hashlib.sha256(actual['css'].encode()).hexdigest() and actual['css_bytes']==len(actual['css'].encode())
    except (KeyError,TypeError,ValueError,AttributeError):return False
