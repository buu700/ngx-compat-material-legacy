"""Eleven finite default mappings preserve the complete historical CSS model."""
import hashlib,json,re
from pathlib import Path
from sass_current_companion_admission import peer_measurement_ok
from sass_datepicker_controls_admission import ORIGINAL_CALENDAR_DENSITY,CURRENT_CALENDAR_FALLBACKS

ROOT=Path(__file__).resolve().parents[1]
_CATALOG=json.loads((ROOT/'fixtures/sass/default-mapped-companion-contracts.json').read_bytes())
DEFAULT_MAPPED_COMPANION_CASES=_CATALOG['cases']
DEFAULT_MAPPED_COMPANION_CONTRACT='historical-default-css-with-public-companion-mapping'
_SCOPES={'sort':['color','theme'],'tree':['color','typography','density','theme'],'progress-bar':['color','theme'],'badge':['theme'],'datepicker':['density','theme']}
_IDS={f'mixin-css/{family}-{d}' for family,ds in _SCOPES.items() for d in ds}
_sha=lambda s:hashlib.sha256(s.encode()).hexdigest()
_RAW=(ROOT/'compatibility/rc/oracles/material-16.2.14-sass-api.json').read_bytes();_ORACLE=json.loads(_RAW)
_SETUP=_ORACLE['standard_theme'].replace('m.define-','peer.m2-define-').replace('m.$','peer.$m2-')
_SOURCESETS={line:{(s['root'],s['path'],s['sha256'],s['bytes']) for s in v['sources']} for line,v in _CATALOG['peer_inputs'].items()}
if (_CATALOG['schema_version']!=1 or hashlib.sha256(_RAW).hexdigest()!=_CATALOG['oracle_sha256']
    or _CATALOG['peer_setup']!=_SETUP or set(DEFAULT_MAPPED_COMPANION_CASES)!=_IDS):raise ValueError('finite default mapped companion scope changed')

def default_mapped_companion_peer_program(case):
    e=DEFAULT_MAPPED_COMPANION_CASES[case];dimensions=['color','typography','density'] if e['dimension']=='theme' else [e['dimension']]
    if e['family']=='badge':includes='@include peer.badge-base($__theme); @include peer.badge-color($__theme); @include peer.badge-typography($__theme); @include peer.badge-density($__theme); .mat-badge-content { @include cdk.high-contrast(active) { outline: solid 1px; border-radius: 0; } }'
    elif e['family']=='datepicker':includes='@include peer.datepicker-base($__theme); '+('@include peer.datepicker-color($__theme); @include peer.datepicker-typography($__theme); ' if e['dimension']=='theme' else '')+'.mat-calendar-controls { @include peer.icon-button-overrides((touch-target-display: none)); .mat-mdc-icon-button.mat-mdc-button-base { @include peer.icon-button-overrides((state-layer-size: 40px)); } }'
    else:includes=' '.join(f'@include peer.tree-{d}($__theme);' for d in ['base']+dimensions) if e['family']=='tree' else f'@include peer.{e["family"]}-{"color" if e["family"]=="progress-bar" else e["dimension"]}($__theme);'
    return "@use '@angular/material' as peer;\n"+("@use '@angular/cdk' as cdk;\n" if e['family']=='badge' else '')+_SETUP+'\n.sass-api-probe { '+includes+' }\n'

for case,e in DEFAULT_MAPPED_COMPANION_CASES.items():
    name=case[10:];inv=_ORACLE['members']['mixins'][name]['invocation']
    program="@use '__entry__' as m;\n"+_ORACLE['standard_theme']+'\n'+e['call']+'\n'
    if (e['family'] not in _SCOPES or e['dimension'] not in _SCOPES[e['family']] or name!=e['family']+'-'+e['dimension']
        or e['call']!=f'.sass-api-probe {{ @include m.{name}($__theme); }}' or e['program_sha256']!=_sha(program)
        or e['original_sha256']!=inv['css_sha256'] or e['original_bytes']!=inv['css_bytes'] or _sha(e['original_css'])!=inv['css_sha256']
        or len(e['original_css'].encode())!=e['original_bytes']
        or any(p['program_sha256']!=_sha(default_mapped_companion_peer_program(case)) for p in e['peers'].values())):raise ValueError('finite default mapped companion reference changed')
    if e['family'] in ['badge','datepicker'] and any(type(p['css']) is not str or _sha(p['css'])!=p['css_sha256'] or len(p['css'].encode())!=p['css_bytes'] for p in e['peers'].values()):raise ValueError('default variant public peer output changed')

def default_mapped_companion_peer_expected_css(case,line):
    e=DEFAULT_MAPPED_COMPANION_CASES[case]
    if e['family'] in ['badge','datepicker']:return e['peers'][line]['css']
    if e['family']=='sort':return '.sass-api-probe {\n  --mat-sort-arrow-color: rgba(0, 0, 0, 0.87);\n}'
    if e['family']=='tree':
        groups={'color':[('container-background-color','white'),('node-text-color','rgba(0, 0, 0, 0.87)')],
            'typography':[('node-text-font','Roboto, sans-serif'),('node-text-size','14px'),('node-text-weight','400')],'density':[('node-min-height','48px')]}
        dimensions=['color','typography','density'] if e['dimension']=='theme' else [e['dimension']]
        return '.sass-api-probe {\n'+'\n'.join(f'  --mat-tree-{key}: {value};' for d in dimensions for key,value in groups[d])+'\n}'
    colors=[('','#3f51b5','rgba(63, 81, 181, 0.25)'),('.mat-accent','#ff4081','rgba(255, 64, 129, 0.25)'),('.mat-warn','#f44336','rgba(244, 67, 54, 0.25)')]
    return '\n'.join(f'.sass-api-probe .mat-mdc-progress-bar{variant} {{\n  --mat-progress-bar-active-indicator-color: {active};\n  --mat-progress-bar-track-color: {track};\n}}' for variant,active,track in colors)

def default_mapped_companion_expected_css(case,peer,line):
    try:
        e=DEFAULT_MAPPED_COMPANION_CASES[case];floor=e['peers'][line];inputs=_CATALOG['peer_inputs'][line]
        if (not peer_measurement_ok(peer,line,floor['program_sha256'],{}) or peer['program']!=default_mapped_companion_peer_program(case)
            or peer['css_sha256']!=floor['css_sha256'] or peer['css_bytes']!=floor['css_bytes'] or peer['css']!=default_mapped_companion_peer_expected_css(case,line)
            or peer['cdk_version']!=peer['peer_version'] or peer['cdk_version']!=inputs['cdk_version'] or peer['cdk_package_json_sha256']!=inputs['cdk_package_json_sha256']
            or len(peer['sources'])!=len(inputs['sources']) or {(s['root'],s['path'],s['sha256'],s['bytes']) for s in peer['sources']}!=_SOURCESETS[line]):return None
        if e['family']=='sort':
            match=re.fullmatch(r'\.sass-api-probe \.mat-sort-header-arrow \{\n  color: ([^;\n]+);\n\}',e['original_css'])
            return '.sass-api-probe .mat-sort-header-arrow {\n  color: var(--mat-sort-arrow-color, '+match[1]+');\n}\n'+peer['css'] if match else None
        if e['family']=='tree':
            tokens={'background':'container-background-color','color':'node-text-color','font-weight':'node-text-weight','font-size':'node-text-size','min-height':'node-min-height'}
            css,count=re.subn(r'^  (background|color|font-weight|font-size|min-height): ([^;\n{}]+);$',lambda m:f'  {m[1]}: var(--mat-tree-{tokens[m[1]]}, {m[2]});',e['original_css'],flags=re.M)
            return css+'\n'+peer['css'] if count=={'color':2,'typography':2,'density':1,'theme':5}[e['dimension']] else None
        if e['family']=='badge':return _default_badge_css(e['original_css'],peer['css'])
        if e['family']=='datepicker':
            original=ORIGINAL_CALENDAR_DENSITY.replace('.sass-argument-probe','.sass-api-probe');fallbacks=CURRENT_CALENDAR_FALLBACKS.replace('.sass-argument-probe','.sass-api-probe')
            return e['original_css'].replace(original,original+'\n'+fallbacks,1)+ ('\n\n' if e['dimension']=='theme' else '\n')+peer['css'] if e['original_css'].count(original)==1 else None
        css,count=re.subn(r'(\.sass-api-probe \.mat-mdc-progress-bar(?:\.mat-(?:accent|warn))? \{\n  --mdc-linear-progress-active-indicator-color: ([^;\n]+);\n  --mdc-linear-progress-track-color: ([^;\n]+);)\n\}',
            lambda m:m[1]+f'\n  --mat-progress-bar-active-indicator-color: {m[2]};\n  --mat-progress-bar-track-color: {m[3]};\n}}',e['original_css'])
        return css if count==3 else None
    except (KeyError,TypeError,ValueError,AttributeError):return None

_BADGE_FORCED='@media (forced-colors: active) {\n  .sass-api-probe .mat-badge-content {\n    outline: solid 1px;\n    border-radius: 0;\n  }\n}'
_BADGE_CLASS='.cdk-high-contrast-active .sass-api-probe .mat-badge-content {\n  outline: solid 1px;\n  border-radius: 0;\n}'
def _default_badge_css(original,peer):
    if not peer.endswith('\n'+_BADGE_FORCED) or original.count('  border-radius: 50%;')!=1:return None
    css=original.replace('  border-radius: 50%;','  border-radius: var(--mat-badge-container-shape, 50%);',1)
    for size,value,geometry,height in [('small','16','legacy-small-size-container-size','small-size-line-height'),('medium','22','legacy-container-size','line-height'),('large','28','legacy-large-size-container-size','large-size-line-height')]:
        before=f'.sass-api-probe .mat-badge-{size} .mat-badge-content {{\n  width: {value}px;\n  height: {value}px;\n  line-height: {value}px;'
        if css.count(before)!=1:return None
        css=css.replace(before,f'.sass-api-probe .mat-badge-{size} .mat-badge-content {{\n  width: var(--mat-badge-{geometry}, {value}px);\n  height: var(--mat-badge-{geometry}, {value}px);\n  line-height: var(--mat-badge-{height}, {value}px);',1)
    if css.count(_BADGE_CLASS+'\n\n')!=1:return None
    return css.replace(_BADGE_CLASS+'\n\n',_BADGE_CLASS+'\n\n'+_BADGE_FORCED+'\n',1)+'\n\n'+peer[:-(len(_BADGE_FORCED)+1)]

def default_mapped_companion_assertion_ok(body):
    try:
        e=DEFAULT_MAPPED_COMPANION_CASES[body['case_id']];m=body['actual_measurement'];c=body['current_companion'];line=body['line']
        if ('current_infrastructure' in body or body['comparison']!=DEFAULT_MAPPED_COMPANION_CONTRACT or c['classification']!='conforming-current-companion'
            or c['contract']!=DEFAULT_MAPPED_COMPANION_CONTRACT or type(body['expected_bytes']) is not int or type(body['actual_bytes']) is not int
            or body['expected_sha256']!=e['original_sha256'] or body['expected_bytes']!=e['original_bytes']):return False
        if (m['line']!=line or m['program_sha256']!=e['program_sha256'] or m['css_sha256']!=_sha(m['css']) or type(m['css_bytes']) is not int
            or m['css_bytes']!=len(m['css'].encode()) or not m['sass_version'].startswith('dart-sass\t1.104.1\t')
            or body['actual_sha256']!=m['css_sha256'] or body['actual_bytes']!=m['css_bytes']):return False
        ss=m['sources']
        if (not ss or any(type(s['root']) is not int or s['root'] not in (0,1,2) or not s['path'] or s['path'].startswith('/') or '\\' in s['path']
            or '..' in s['path'].split('/') or not re.fullmatch('[0-9a-f]{64}',s['sha256']) or type(s['bytes']) is not int or s['bytes']<1 for s in ss)
            or len({(s['root'],s['path']) for s in ss})!=len(ss)):return False
        required=['_index.scss','styles/bridges/_companion-overrides.scss','styles/bridges/_m2-system.scss','styles/core/theming/_theming.scss',f'styles/{e["family"]}/_{e["family"]}-theme.scss']
        if e['family']=='progress-bar':required.append('styles/legacy-progress-bar/_progress-bar-theme.scss')
        if e['family']=='badge':required.append('styles/core/style/_high-contrast.scss')
        if not all(any(s['root']==0 and s['path']==path for s in ss) for path in required):return False
        expected=default_mapped_companion_expected_css(body['case_id'],c['peer'],line)
        return expected is not None and expected==m['css']
    except (KeyError,TypeError,ValueError,AttributeError):return False

def default_mapped_companion_envelope_ok(active,body,invocation):
    try:
        fields=dict(kind='assertion',check_id='sass-seal',group='sass-api-and-values',result='pass',exit_code=0,line=active.binding['source_line'],run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,
            oracle='compatibility/rc/oracles/material-16.2.14-sass-api.json',oracle_sha256=_CATALOG['oracle_sha256'])
        if any(body.get(k)!=v or type(body.get(k))!=type(v) for k,v in fields.items()):return False
        library=[a for a in active.manifest['artifacts'] if a['id']=='library']
        return len(library)==1 and body['tarball_sha256']==library[0]['sha256'] and default_mapped_companion_assertion_ok(body)
    except (KeyError,TypeError,ValueError,AttributeError):return False
