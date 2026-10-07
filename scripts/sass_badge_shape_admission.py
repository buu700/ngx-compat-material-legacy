"""Two finite badge themes retain authentic selectors, accessibility and motion."""
import hashlib
import json
from pathlib import Path
from sass_current_companion_admission import peer_measurement_ok
_CATALOG=json.loads((Path(__file__).resolve().parents[1]/'fixtures/sass/badge-shape-contracts.json').read_bytes())
BADGE_SHAPE_CASES=_CATALOG['cases']
if _CATALOG['schema_version']!=1 or set(BADGE_SHAPE_CASES)!={'mixin-argument/badge-theme/custom-full-theme','mixin-argument/badge-theme/custom-dark-theme'}:raise ValueError('finite badge shape scope changed')
_FORCED='@media (forced-colors: active) {\n  .sass-argument-probe .mat-badge-content {\n    outline: solid 1px;\n    border-radius: 0;\n  }\n}'
_ORIGINAL='.cdk-high-contrast-active .sass-argument-probe .mat-badge-content {\n  outline: solid 1px;\n  border-radius: 0;\n}'
def badge_shape_expected_css(body):
    try:
        entry=BADGE_SHAPE_CASES[body['case_id']]
        if body.get('comparison')!='current-companion-contract':return None
        contract=body['current_companion']
        if contract['classification']!='conforming-current-companion' or contract['contract']!='historical-badge-shape-with-current-tokens':return None
        original=body['expected'];peer=contract['peer'];line=body['line'];floor=entry['peers'][line]
        if original['css_sha256']!=entry['original_sha256'] or hashlib.sha256(original['css'].encode()).hexdigest()!=entry['original_sha256'] or original['css_bytes']!=len(original['css'].encode()):return None
        if not peer_measurement_ok(peer,line,floor['program_sha256'],_CATALOG['sources'][line]) or peer['css_sha256']!=floor['css_sha256'] or not peer['css'].endswith('\n'+_FORCED):return None
        if _CATALOG['cdk_sources'][line] not in peer['sources']:return None
        css=original['css'].replace('  border-radius: 50%;','  border-radius: var(--mat-badge-container-shape, 50%);',1)
        for size,value,geometry,height in [('small','16','legacy-small-size-container-size','small-size-line-height'),('medium','22','legacy-container-size','line-height'),('large','28','legacy-large-size-container-size','large-size-line-height')]:
            before=f'.sass-argument-probe .mat-badge-{size} .mat-badge-content {{\n  width: {value}px;\n  height: {value}px;\n  line-height: {value}px;'
            if before not in css:return None
            css=css.replace(before,f'.sass-argument-probe .mat-badge-{size} .mat-badge-content {{\n  width: var(--mat-badge-{geometry}, {value}px);\n  height: var(--mat-badge-{geometry}, {value}px);\n  line-height: var(--mat-badge-{height}, {value}px);',1)
        if _ORIGINAL+'\n\n' not in css:return None
        css=css.replace(_ORIGINAL+'\n\n',_ORIGINAL+'\n\n'+_FORCED+'\n',1)
        return css+'\n\n'+peer['css'][:-(len(_FORCED)+1)]
    except (KeyError,TypeError,ValueError,AttributeError):return None

def badge_shape_results_match(body):
    expected=badge_shape_expected_css(body);actual=body.get('actual') or {}
    try:
        return expected is not None and actual['css']==expected and actual['css_sha256']==hashlib.sha256(actual['css'].encode()).hexdigest() and actual['css_bytes']==len(actual['css'].encode())
    except (KeyError,TypeError,ValueError,AttributeError):return False
