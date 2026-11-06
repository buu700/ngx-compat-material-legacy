"""Eight finite aggregate color/themes: whole original CSS and public additions."""
import hashlib
import json
import re
from pathlib import Path
from sass_stepper_historical_model import historical_stepper_peer_css
from sass_current_companion_admission import peer_measurement_ok
from sass_datepicker_controls_admission import ORIGINAL_CALENDAR_DENSITY, CURRENT_CALENDAR_FALLBACKS
from sass_form_field_state_admission import FORM_FIELD_STATE_AGGREGATE_CASES, insert_form_field_state_in_aggregate
from sass_ripple_color_admission import insert_ripple_color_in_expected_model, ripple_color_measurement_ok
_ROOT=Path(__file__).resolve().parents[1]
_CATALOG=json.loads((_ROOT/'fixtures/sass/aggregate-color-theme-contracts.json').read_bytes())
AGGREGATE_COLOR_THEME_CASES=_CATALOG['cases']
_NAMES=['all-component-colors','all-component-themes','all-legacy-component-colors','all-legacy-component-themes']
_IDS={f'mixin-argument/{n}/{v}' for n in _NAMES for v in ['custom-full-theme','raw-color-config' if n.endswith('colors') else 'custom-dark-theme']}
_FAMILIES=['badge','bottom-sheet','button-toggle','datepicker','divider','expansion','grid-list','icon','sidenav','stepper','sort','toolbar','tree']
_sha=lambda s:hashlib.sha256(s.encode()).hexdigest()
_oracle_bytes=(_ROOT/'compatibility/rc/oracles/material-16.2.14-sass-api.json').read_bytes()
_oracle=json.loads(_oracle_bytes)
if (_CATALOG['schema_version']!=1 or set(AGGREGATE_COLOR_THEME_CASES)!=_IDS
    or hashlib.sha256(_oracle_bytes).hexdigest()!=_CATALOG['original_membership']['oracle_sha256']
    or any(_oracle['members']['mixins'][n]['aggregate']!=_CATALOG['original_membership']['aggregates'][n] for n in _NAMES)):
    raise ValueError('finite color/theme aggregate scope changed')
_HC='.cdk-high-contrast-active .sass-argument-probe .mat-badge-content {\n  outline: solid 1px;\n  border-radius: 0;\n}'

def _members(css):
    result={}
    for f in _FAMILIES+['current-high-contrast','current-progress-color']:
        start=f'/*!__closeout_{f}_begin__*/';end=f'/*!__closeout_{f}_end__*/'
        if css.count(start)!=1 or css.count(end)!=1:return None
        result[f]=css.split(start)[1].split(end)[0].strip()
    return result

def _parent(*parts):
    opening='.sass-argument-probe {\n';values=[v for v in parts if v]
    if any(not v.startswith(opening) or not v.endswith('\n}') or v.count(opening)!=1 for v in values):return None
    return opening+'\n'.join(v[len(opening):-2] for v in values)+'\n}'

def _badge(original,peer,forced,separator):
    if original.count('  border-radius: 50%;')!=1 or original.count(_HC+'\n\n')!=1:return None
    css=original.replace('  border-radius: 50%;','  border-radius: var(--mat-badge-container-shape, 50%);')
    for size,value,geometry,height in [('small',16,'legacy-small-size-container-size','small-size-line-height'),('medium',22,'legacy-container-size','line-height'),('large',28,'legacy-large-size-container-size','large-size-line-height')]:
        old=f'.sass-argument-probe .mat-badge-{size} .mat-badge-content {{\n  width: {value}px;\n  height: {value}px;\n  line-height: {value}px;'
        if css.count(old)!=1:return None
        css=css.replace(old,f'.sass-argument-probe .mat-badge-{size} .mat-badge-content {{\n  width: var(--mat-badge-{geometry}, {value}px);\n  height: var(--mat-badge-{geometry}, {value}px);\n  line-height: var(--mat-badge-{height}, {value}px);')
    return css.replace(_HC+'\n\n',_HC+'\n\n'+forced+'\n')+separator+peer

def aggregate_color_theme_expected_css(body):
    try:
        entry=AGGREGATE_COLOR_THEME_CASES[body['case_id']];profile=_CATALOG['profiles'][entry['peer_profile']]
        original=body['expected'];contract=body['current_companion'];peer=contract['peer'];line=body['line'];floor=profile['peers'][line];sources=_CATALOG['sources'][line]
        if (body.get('comparison')!='current-companion-contract' or contract['classification']!='conforming-current-companion'
            or contract['contract']!='historical-color-theme-aggregate-with-qualified-members'):return None
        if (original['css_sha256']!=entry['original_sha256'] or _sha(original['css'])!=entry['original_sha256'] or original['css_bytes']!=len(original['css'].encode())
            or not peer_measurement_ok(peer,line,floor['program_sha256'],{s['path']:(s['sha256'],s['bytes']) for s in sources if s['root']==0})
            or peer['css_sha256']!=floor['css_sha256'] or len(peer['sources'])!=len(sources) or any(s not in peer['sources'] for s in sources)):return None
        p=_members(peer['css']);o={f:m['css'] for f,m in profile['originals'].items()}
        if p is None or any(f not in o or _sha(o[f])!=profile['originals'][f]['css_sha256'] or len(o[f].encode())!=profile['originals'][f]['css_bytes'] for f in _FAMILIES):return None
        p['stepper']=historical_stepper_peer_css(p['stepper'],o['stepper'],line,True)
        if p['stepper'] is None:return None
        if p['grid-list']!=o['grid-list'] or p['icon']!=o['icon'].replace('}\n\n.sass-argument-probe .mat-icon.mat-primary','}\n.sass-argument-probe .mat-icon.mat-primary'):return None
        order=[f for f in _FAMILIES if o[f]];css=original['css']
        if any(css.count(o[f])!=1 for f in order):return None
        start=css.index(o['badge']);tail=''.join(o[f]+(profile['separators'][f] if i<len(order)-1 else '') for i,f in enumerate(order))
        if css[start:]!=tail:return None
        prefix=css[:start];pattern=r'  --mdc-linear-progress-active-indicator-color: ([^;\n]+);\n  --mdc-linear-progress-track-color: ([^;\n]+);'
        if entry['profile']=='2018':
            pairs=re.findall(pattern,prefix);public_pairs=re.findall(r'  --mat-progress-bar-active-indicator-color: ([^;\n]+);\n  --mat-progress-bar-track-color: ([^;\n]+);',p['current-progress-color'])
            if len(pairs)!=3 or pairs!=public_pairs:return None
            prefix=re.sub(pattern,lambda m:m[0]+'\n  --mat-progress-bar-active-indicator-color: '+m[1]+';\n  --mat-progress-bar-track-color: '+m[2]+';',prefix)
        elif '--mdc-linear-progress-active-indicator-color' in prefix:return None
        separator='\n' if profile['dimension']=='colors' else '\n\n'
        added=lambda f:o[f]+(separator if f=='toolbar' else '\n\n')+p[f]
        badge=_badge(o['badge'],p['badge'],p['current-high-contrast'],separator);expansion=_parent(p['expansion'],p['grid-list'])
        if badge is None or expansion is None:return None
        datepicker=o['datepicker']
        if profile['dimension']=='themes':
            if datepicker.count(ORIGINAL_CALENDAR_DENSITY)!=1:return None
            datepicker=datepicker.replace(ORIGINAL_CALENDAR_DENSITY,ORIGINAL_CALENDAR_DENSITY+'\n'+CURRENT_CALENDAR_FALLBACKS)
        datepicker+=separator+p['datepicker']
        sort=re.sub(r'^  color: ([^;\n]+);$',lambda m:'  color: var(--mat-sort-arrow-color, '+m[1]+');',o['sort'],flags=re.M)+'\n'+p['sort']
        tokens={'background':'container-background-color','color':'node-text-color','font-weight':'node-text-weight','font-size':'node-text-size','min-height':'node-min-height'}
        tree=re.sub(r'^  (background|color|font-weight|font-size|min-height): ([^;\n]+);$',lambda m:'  '+m[1]+': var(--mat-tree-'+tokens[m[1]]+', '+m[2]+');',o['tree'],flags=re.M)+'\n'+p['tree']
        # Whole owned prefix, original icon rules and motion remain exact.
        css = prefix+'\n'.join([badge,added('bottom-sheet'),added('button-toggle'),datepicker,added('divider'),o['expansion']+'\n\n'+expansion,o['icon'],added('sidenav'),added('stepper'),sort,added('toolbar'),tree])
        with_state=insert_form_field_state_in_aggregate(body['case_id'],css,peer) if body['case_id'] in FORM_FIELD_STATE_AGGREGATE_CASES else css
        return insert_ripple_color_in_expected_model(body['case_id'],with_state,peer,aggregate=True)
    except (KeyError,TypeError,ValueError,AttributeError):return None

def aggregate_color_theme_results_match(body):
    if not ripple_color_measurement_ok(body.get('case_id'),body.get('actual'),body.get('line')):return False
    expected=aggregate_color_theme_expected_css(body);actual=body.get('actual') or {}
    try:
        return expected is not None and actual['css']==expected and actual['css_sha256']==_sha(actual['css']) and actual['css_bytes']==len(actual['css'].encode())
    except (KeyError,TypeError,ValueError,AttributeError):return False
