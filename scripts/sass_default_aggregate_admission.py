"""Eight finite default aggregates retain historical membership and complete CSS."""
import hashlib,json,re
from pathlib import Path
from sass_current_companion_admission import peer_measurement_ok
from sass_form_field_state_admission import FORM_FIELD_STATE_AGGREGATE_CASES, insert_form_field_state_in_aggregate
from sass_ripple_color_admission import RIPPLE_COLOR_BINDING_CASES, insert_ripple_color_in_expected_model, ripple_color_measurement_ok
ROOT=Path(__file__).resolve().parents[1]
_CATALOG=json.loads((ROOT/'fixtures/sass/default-aggregate-contracts.json').read_bytes())
_RAW=(ROOT/'compatibility/rc/oracles/material-16.2.14-sass-api.json').read_bytes();_ORACLE=json.loads(_RAW)
_sha=lambda s:hashlib.sha256(s.encode()).hexdigest()
_NAMES={'all-component-colors':'colors','all-component-densities':'density','all-component-themes':'themes','all-component-typographies':'typography-2018','all-legacy-component-colors':'colors','all-legacy-component-themes':'themes','all-legacy-component-typographies':'typography-legacy','private-all-legacy-component-densities':'density'}
families=['badge','bottom-sheet','button-toggle','datepicker','divider','expansion','grid-list','icon','sidenav','stepper','sort','toolbar','tree']
_DENSITY=['expansion','stepper','toolbar','tree','button-toggle']
scope='.sass-api-probe';opening=scope+' {\n'
_SOURCESETS={line:{(s['root'],s['path'],s['sha256'],s['bytes']) for s in v['sources']} for line,v in _CATALOG['peer_inputs'].items()}
if (_CATALOG['schema_version']!=1 or hashlib.sha256(_RAW).hexdigest()!=_CATALOG['oracle_sha256'] or _CATALOG['default_theme']!=_ORACLE['standard_theme']
    or set(_CATALOG['cases'])!={f'mixin-css/{n}' for n in _NAMES} or set(_CATALOG['profiles'])!=set(_NAMES.values())):raise ValueError('finite default aggregate scope changed')
DEFAULT_AGGREGATE_CASES=_CATALOG['cases']
DEFAULT_AGGREGATE_CONTRACT='historical-default-aggregate-with-qualified-public-members'
def _info(profile):
    legacy=profile=='typography-legacy';dimension='typography' if profile.startswith('typography') else 'color' if profile=='colors' else 'theme' if profile=='themes' else 'density'
    fs=_DENSITY if profile=='density' else families;helpers=profile in ['colors','themes'];setup=_ORACLE['standard_theme'].replace('m.define-','peer.m2-define-').replace('m.$','peer.$m2-')
    return dict(legacy=legacy,dimension=dimension,families=fs,public_families=fs+['current-high-contrast','current-progress-color'] if helpers else fs,helpers=helpers,peer_setup=setup.replace('peer.m2-define-typography-config()','peer.m2-define-legacy-typography-config()') if legacy else setup)
def _marker(f,part):return f'/*!__default_aggregate_{f}_{part}__*/'
def default_aggregate_peer_program(case):
    e=DEFAULT_AGGREGATE_CASES[case];p=_info(e['profile']);dims=['color','typography','density'] if p['dimension']=='theme' else [p['dimension']]
    pieces=[]
    for f in p['families']:
        selected=[d for d in dims if d!='density'] if f=='datepicker' else dims
        controls=' .mat-calendar-controls { @include peer.icon-button-overrides((touch-target-display: none)); .mat-mdc-icon-button.mat-mdc-button-base { @include peer.icon-button-overrides((state-layer-size: 40px)); } }' if f=='datepicker' and 'density' in dims else ''
        pieces.append(_marker(f,'begin')+'\n.sass-api-probe { '+' '.join(f'@include peer.{f}-{d}($__theme);' for d in ['base']+selected)+controls+' }\n'+_marker(f,'end'))
    helpers=_marker('current-high-contrast','begin')+'\n.sass-api-probe .mat-badge-content { @include cdk.high-contrast(active) { outline: solid 1px; border-radius: 0; } }\n'+_marker('current-high-contrast','end')+'\n'+_marker('current-progress-color','begin')+'\n.sass-api-probe { @include peer.progress-bar-color($__theme); }\n'+_marker('current-progress-color','end')+'\n' if p['helpers'] else ''
    return "@use '@angular/material' as peer;\n"+("@use '@angular/cdk' as cdk;\n" if p['helpers'] else '')+p['peer_setup']+'\n'+'\n'.join(pieces)+'\n'+helpers
for case,e in DEFAULT_AGGREGATE_CASES.items():
    n=case[10:];entry=_ORACLE['members']['mixins'][n];p=_CATALOG['profiles'][_NAMES[n]];info=_info(_NAMES[n]);call=f'.sass-api-probe {{ @include m.{n}({"" if n.endswith("typographies") else "$__theme"}); }}'
    program="@use '__entry__' as m;\n"+_ORACLE['standard_theme']+'\n'+call+'\n';parent_path,leaf=entry['file'].rsplit('/',1)
    if (e['name']!=n or e['profile']!=_NAMES[n] or e['call']!=call or e['program_sha256']!=_sha(program) or e['source_path']!='styles/'+parent_path+'/_'+leaf+'.scss' or e['aggregate']!=entry.get('aggregate')
        or e['original_sha256']!=entry['invocation']['css_sha256'] or e['original_bytes']!=entry['invocation']['css_bytes'] or _sha(e['original_css'])!=e['original_sha256'] or len(e['original_css'].encode())!=e['original_bytes']):raise ValueError('default aggregate original or membership changed')
    if any(p[k]!=info[k] for k in ['dimension','legacy','families','public_families','peer_setup']):raise ValueError('default aggregate input profile changed')
    if set(p['originals'])!=set(info['families']) or any(_sha(m['css'])!=m['css_sha256'] or len(m['css'].encode())!=m['css_bytes'] for m in p['originals'].values()):raise ValueError('default aggregate original member capsule changed')
    setup=_ORACLE['standard_theme'].replace('m.','original.');argument=f'original.define-{"legacy-" if info["legacy"] else ""}typography-config()' if info['dimension']=='typography' else '(color: original.get-color-config($__theme), typography: null, density: null)' if e['profile']=='colors' else '$__theme'
    original_program="@use '__reference__' as original;\n"+setup+'\n$__argument: '+argument+';\n'+'\n'.join(_marker(f,'begin')+f'\n.sass-api-probe {{ @include original.{f}-{"theme" if e["profile"]=="colors" else info["dimension"]}($__argument); }}\n'+_marker(f,'end') for f in info['families'])+'\n'
    if p['original_program']!=original_program or p['original_program_sha256']!=_sha(original_program) or any(f['program_sha256']!=_sha(default_aggregate_peer_program(case)) for f in p['peers'].values()):raise ValueError('default aggregate measurement recipe changed')
_PRIVATE=_CATALOG['private_density_membership']
if _PRIVATE['source_path']!='@angular/material/legacy-core/density/private/_all-density.scss' or _PRIVATE['includes']!=['form-field-theme.density','expansion-theme.density','stepper-theme.density','toolbar-theme.density','tree-theme.density','button-toggle-theme.density']:raise ValueError('private density membership changed')
_IDENTITY=json.loads((ROOT/'compatibility/rc/original16-sass-source-diagnostic-identity.json').read_bytes())
if not any(s['path']==_PRIVATE['source_path'] and s['sha256']==_PRIVATE['sha256'] and s['bytes']==_PRIVATE['bytes'] for ss in _IDENTITY['loaded_source_sets'].values() for s in ss):raise ValueError('private density membership source is not authenticated')
def _require(value):
    if not value:raise ValueError('default aggregate complete historical model differs')
def _members(css,fs):
    result={}
    for f in fs:
        start=_marker(f,'begin');end=_marker(f,'end')
        if css.count(start)!=1 or css.count(end)!=1:return None
        result[f]=css.split(start)[1].split(end)[0].strip()
    return result

hc='.cdk-high-contrast-active '+scope+' .mat-badge-content {\n  outline: solid 1px;\n  border-radius: 0;\n}'
calendar=scope+' .mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base {\n  --mdc-icon-button-state-layer-size: 40px;\n  width: var(--mdc-icon-button-state-layer-size);\n  height: var(--mdc-icon-button-state-layer-size);\n  padding: 8px;\n}\n'+scope+' .mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base .mat-mdc-button-touch-target {\n  display: none;\n}'
fallbacks=scope+' .mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base {\n  width: var(--mat-icon-button-state-layer-size, var(--mdc-icon-button-state-layer-size));\n  height: var(--mat-icon-button-state-layer-size, var(--mdc-icon-button-state-layer-size));\n}\n'+scope+' .mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base .mat-mdc-button-touch-target {\n  display: var(--mat-icon-button-touch-target-display, none);\n}'

def parent(*parts):
    parts = [p for p in parts if p]
    _require(all((p.startswith(opening) and p.endswith('\n}') and (p.count(opening) == 1) for p in parts)))
    return opening + '\n'.join((p[len(opening):-2] for p in parts)) + '\n}'

def originals(profile):
    return {f: m['css'] for f, m in profile['originals'].items()}

def density(css, profile, p):
    o = originals(profile)
    order = profile['families']
    tail = '\n\n'.join((o[f] for f in order[:-1])) + '\n' + o[order[-1]]
    _require(css.endswith(tail) and css.count(tail) == 1)
    parts = {f: o[f] + '\n\n' + p[f] for f in ['expansion', 'stepper', 'button-toggle']}
    _require(p['toolbar'] == o['toolbar'])
    tree = re.sub('^  min-height: ([^;\\n]+);$', lambda m: '  min-height: var(--mat-tree-node-min-height, ' + m[1] + ');', o['tree'], flags=re.M) + '\n' + p['tree']
    joined = parts['stepper'][:-2] + '\n' + o['toolbar'][len(opening):]
    return css[:-len(tail)] + '\n'.join([parts['expansion'], joined, tree, parts['button-toggle']])

def typography(css, profile, p):
    o = originals(profile)
    _require(p['grid-list'] == o['grid-list'] and p['toolbar'] == o['toolbar'] and (p['icon'] == p['sort'] == ''))
    _require(all((o[f] == '' for f in ['divider', 'icon', 'sidenav', 'sort'])))
    order = ['bottom-sheet', 'button-toggle', 'datepicker', 'expansion', 'grid-list', 'stepper', 'toolbar', 'tree']
    _require(all((o[f] and css.count(o[f]) == 1 for f in ['badge'] + order)))
    badge = css.index(o['badge'])
    bottom = css.index(o['bottom-sheet'])
    tail = '\n\n'.join((o[f] for f in order))
    _require(css[bottom:bottom + len(tail)] == tail and bottom >= badge + len(o['badge']))
    middle = css[badge + len(o['badge']):bottom]
    suffix = css[bottom + len(tail):]
    _require(middle.startswith('\n\n') and suffix.startswith('\n'))
    added = lambda f: o[f] + '\n\n' + p[f]
    button = parent(p['button-toggle'], p['divider'])
    expansion = parent(p['expansion'], p['grid-list'], p['sidenav'])
    stepper = parent(p['stepper'], p['toolbar'])
    tree = re.sub('^  (font-weight|font-size): ([^;\\n{}]+);$', lambda m: '  ' + m[1] + ': var(--mat-tree-node-text-' + ('weight' if m[1] == 'font-weight' else 'size') + ', ' + m[2] + ');', o['tree'], flags=re.M) + '\n' + p['tree']
    pieces = [added('bottom-sheet'), o['button-toggle'] + '\n\n' + button, added('datepicker'), o['expansion'] + '\n\n' + expansion, o['stepper'] + '\n\n' + stepper, tree]
    return css[:badge] + added('badge') + middle[1:] + '\n'.join(pieces) + suffix

def color_theme(css, profile, p, name):
    o = originals(profile)
    order = [f for f in families if o[f]]
    pos = [css.find(o[f]) for f in order]
    _require(all((css.count(o[f]) == 1 for f in order)))
    separators = {f: css[pos[i] + len(o[f]):pos[i + 1]] for i, f in enumerate(order[:-1])}
    _require(all((v in ['\n', '\n\n'] for v in separators.values())))
    start = pos[0]
    tail = ''.join((o[f] + (separators[f] if i < len(order) - 1 else '') for i, f in enumerate(order)))
    _require(css[start:] == tail)
    _require(p['grid-list'] == o['grid-list'] and p['icon'] == o['icon'].replace('}\n\n' + scope + ' .mat-icon.mat-primary', '}\n' + scope + ' .mat-icon.mat-primary'))
    prefix = css[:start]
    pattern = '  --mdc-linear-progress-active-indicator-color: ([^;\\n]+);\\n  --mdc-linear-progress-track-color: ([^;\\n]+);'
    pairs = re.findall(pattern, prefix)
    public_pairs = re.findall('  --mat-progress-bar-active-indicator-color: ([^;\\n]+);\\n  --mat-progress-bar-track-color: ([^;\\n]+);', p['current-progress-color'])
    if name.startswith('all-component-'):
        _require(len(pairs) == 3 and pairs == public_pairs)
        prefix = re.sub(pattern, lambda m: m[0] + '\n  --mat-progress-bar-active-indicator-color: ' + m[1] + ';\n  --mat-progress-bar-track-color: ' + m[2] + ';', prefix)
    else:
        _require(not pairs)
    separator = '\n' if profile['dimension'] == 'color' else '\n\n'
    badge = o['badge']
    _require(badge.count('  border-radius: 50%;') == 1 and badge.count(hc + '\n\n') == 1)
    badge = badge.replace('  border-radius: 50%;', '  border-radius: var(--mat-badge-container-shape, 50%);')
    for size, value, geometry, height in [('small', 16, 'legacy-small-size-container-size', 'small-size-line-height'), ('medium', 22, 'legacy-container-size', 'line-height'), ('large', 28, 'legacy-large-size-container-size', 'large-size-line-height')]:
        old = f'{scope} .mat-badge-{size} .mat-badge-content {{\n  width: {value}px;\n  height: {value}px;\n  line-height: {value}px;'
        _require(badge.count(old) == 1)
        badge = badge.replace(old, f'{scope} .mat-badge-{size} .mat-badge-content {{\n  width: var(--mat-badge-{geometry}, {value}px);\n  height: var(--mat-badge-{geometry}, {value}px);\n  line-height: var(--mat-badge-{height}, {value}px);')
    badge = badge.replace(hc + '\n\n', hc + '\n\n' + p['current-high-contrast'] + '\n') + separator + p['badge']
    added = lambda f: o[f] + (separator if f == 'toolbar' else '\n\n') + p[f]
    expansion = parent(p['expansion'], p['grid-list'])
    datepicker = o['datepicker']
    if profile['dimension'] == 'theme':
        _require(datepicker.count(calendar) == 1)
        datepicker = datepicker.replace(calendar, calendar + '\n' + fallbacks)
    datepicker += separator + p['datepicker']
    sort = re.sub('^  color: ([^;\\n]+);$', lambda m: '  color: var(--mat-sort-arrow-color, ' + m[1] + ');', o['sort'], flags=re.M) + '\n' + p['sort']
    tokens = {'background': 'container-background-color', 'color': 'node-text-color', 'font-weight': 'node-text-weight', 'font-size': 'node-text-size', 'min-height': 'node-min-height'}
    tree = re.sub('^  (background|color|font-weight|font-size|min-height): ([^;\\n]+);$', lambda m: '  ' + m[1] + ': var(--mat-tree-' + tokens[m[1]] + ', ' + m[2] + ');', o['tree'], flags=re.M) + '\n' + p['tree']
    return prefix + '\n'.join([badge, added('bottom-sheet'), added('button-toggle'), datepicker, added('divider'), o['expansion'] + '\n\n' + expansion, o['icon'], added('sidenav'), added('stepper'), sort, added('toolbar'), tree])

def default_aggregate_expected_css(case,peer,line):
    try:
        e=DEFAULT_AGGREGATE_CASES[case];profile=_CATALOG['profiles'][e['profile']];floor=profile['peers'][line];inputs=_CATALOG['peer_inputs'][line]
        if (not peer_measurement_ok(peer,line,floor['program_sha256'],{}) or peer['program']!=default_aggregate_peer_program(case)
            or peer['css_sha256']!=floor['css_sha256'] or peer['css_bytes']!=floor['css_bytes'] or peer['cdk_version']!=peer['peer_version']
            or peer['cdk_version']!=inputs['cdk_version'] or peer['cdk_package_json_sha256']!=inputs['cdk_package_json_sha256']
            or len(peer['sources'])!=len(inputs['sources']) or {(s['root'],s['path'],s['sha256'],s['bytes']) for s in peer['sources']}!=_SOURCESETS[line]):return None
        p=_members(peer['css'],profile['public_families'])
        if p is None:return None
        css=e['original_css']
        modeled = density(css,profile,p) if profile['dimension']=='density' else typography(css,profile,p) if profile['dimension']=='typography' else color_theme(css,profile,p,e['name'])
        with_state=insert_form_field_state_in_aggregate(case,modeled,peer) if case in FORM_FIELD_STATE_AGGREGATE_CASES else modeled
        return insert_ripple_color_in_expected_model(case,with_state,peer,aggregate=True) if case in RIPPLE_COLOR_BINDING_CASES else with_state
    except (KeyError,TypeError,ValueError,AttributeError):return None

def default_aggregate_assertion_ok(body):
    if body.get('case_id') in RIPPLE_COLOR_BINDING_CASES and not ripple_color_measurement_ok(body['case_id'],body.get('actual_measurement'),body.get('line')):return False
    try:
        e=DEFAULT_AGGREGATE_CASES[body['case_id']];m=body['actual_measurement'];c=body['current_companion'];line=body['line']
        if ('current_infrastructure' in body or body['comparison']!=DEFAULT_AGGREGATE_CONTRACT or c['classification']!='conforming-current-companion'
            or c['contract']!=DEFAULT_AGGREGATE_CONTRACT or type(body['expected_bytes']) is not int or type(body['actual_bytes']) is not int
            or body['expected_sha256']!=e['original_sha256'] or body['expected_bytes']!=e['original_bytes']):return False
        if (m['line']!=line or m['program_sha256']!=e['program_sha256'] or m['css_sha256']!=_sha(m['css']) or type(m['css_bytes']) is not int
            or m['css_bytes']!=len(m['css'].encode()) or not m['sass_version'].startswith('dart-sass\t1.104.1\t')
            or body['actual_sha256']!=m['css_sha256'] or body['actual_bytes']!=m['css_bytes']):return False
        ss=m['sources']
        if (not ss or any(type(s['root']) is not int or s['root'] not in (0,1,2) or not s['path'] or s['path'].startswith('/') or '\\' in s['path']
            or '..' in s['path'].split('/') or not re.fullmatch('[0-9a-f]{64}',s['sha256']) or type(s['bytes']) is not int or s['bytes']<1 for s in ss)
            or len({(s['root'],s['path']) for s in ss})!=len(ss)):return False
        required=['_index.scss','styles/bridges/_companion-overrides.scss','styles/bridges/_m2-system.scss','styles/core/theming/_theming.scss',e['source_path']]
        if not all(any(s['root']==0 and s['path']==path for s in ss) for path in required):return False
        if body['case_id']=='mixin-css/private-all-legacy-component-densities' and not any(s['root']==0 and s['path']==e['source_path'] and s['sha256']==_PRIVATE['sha256'] and s['bytes']==_PRIVATE['bytes'] for s in ss):return False
        if body['case_id']=='mixin-css/all-component-densities':
            from sass_ordinary_density_gate import OrdinaryDensityGateContext,ordinary_density_gate_match
            return ordinary_density_gate_match(OrdinaryDensityGateContext(ROOT),body)
        if 'current_ordinary_density' in body:return False
        expected=default_aggregate_expected_css(body['case_id'],c['peer'],line)
        return expected is not None and expected==m['css']
    except (KeyError,TypeError,ValueError,AttributeError):return False

def default_aggregate_envelope_ok(active,body,invocation):
    try:
        fields=dict(kind='assertion',check_id='sass-seal',group='sass-api-and-values',result='pass',exit_code=0,line=active.binding['source_line'],run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,
            oracle='compatibility/rc/oracles/material-16.2.14-sass-api.json',oracle_sha256=_CATALOG['oracle_sha256'])
        if any(body.get(k)!=v or type(body.get(k))!=type(v) for k,v in fields.items()):return False
        library=[a for a in active.manifest['artifacts'] if a['id']=='library']
        return len(library)==1 and body['tarball_sha256']==library[0]['sha256'] and default_aggregate_assertion_ok(body)
    except (KeyError,TypeError,ValueError,AttributeError):return False
