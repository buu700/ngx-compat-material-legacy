"""One whole ordered aggregate: historical sequence and exact public contributions."""
import hashlib,json,re
from pathlib import Path
from sass_current_companion_admission import peer_measurement_ok
from sass_ordered_core_admission import ordered_core_expected_css
from sass_ripple_color_admission import insert_ripple_color_in_expected_model, ripple_color_measurement_ok
ROOT=Path(__file__).resolve().parents[1]
_CATALOG=json.loads((ROOT/'fixtures/sass/ordered-aggregate-contracts.json').read_bytes())
ORDERED_AGGREGATE_CASES=_CATALOG['cases']
ORDERED_AGGREGATE_CONTRACT='historical-ordered-aggregate-with-qualified-public-members'
_CASE='06-aggregate-and-companions';_ENTRY=ORDERED_AGGREGATE_CASES[_CASE]
_sha=lambda s:hashlib.sha256(s.encode()).hexdigest()
_SOURCE=_CATALOG['fixture_source'];_PRELUDE=_SOURCE[:_SOURCE.index('@include mat.core();')]
_FAMILIES=['badge','bottom-sheet','button-toggle','datepicker','divider','expansion','grid-list','icon','sidenav','stepper','sort','toolbar','tree']
_GROUPS=['light','dark','panel']
_marker=lambda g,f,p:f'/*!__ordered_aggregate_{g}_{f}_{p}__*/'
_raw=(ROOT/_ENTRY['reference']).read_bytes()
if (_CATALOG['schema_version']!=1 or list(ORDERED_AGGREGATE_CASES)!=[_CASE] or list(_CATALOG['profiles'])!=_GROUPS
    or _ENTRY['fixture']!=f'fixtures/sass/{_CASE}.scss' or _ENTRY['reference']!=f'reference/material-16.2.14/sass-css/{_CASE}.css'
    or _sha(_SOURCE)!=_ENTRY['fixture_sha256'] or _sha(_SOURCE.replace("'@angular/material'","'__entry__'"))!=_ENTRY['program_sha256']
    or _ENTRY['reference_sha256']!='b9e73e138556f00c4077c19032587c2b78a64aad0ecc46abc3dca56b1eb95070'
    or hashlib.sha256(_raw).hexdigest()!=_ENTRY['reference_sha256'] or len(_raw)!=_ENTRY['reference_bytes']
    or list(_CATALOG['parts'])!=['core','light','dark','panel'] or '\n\n'.join(_CATALOG['parts'].values())!=_raw.decode()):raise ValueError('ordered aggregate frozen inputs changed')

def ordered_aggregate_peer_program(group):
    fs=['expansion'] if group=='panel' else _FAMILIES;scope='' if group=='light' else '.dark-shell' if group=='dark' else '.single-panel'
    ds=['color','density'] if group=='dark' else ['color','typography','density']
    setup=_PRELUDE.replace('as mat;','as peer;').replace('mat.define-','peer.m2-define-').replace('mat.$','peer.$m2-')
    program="@use '@angular/material' as peer;\n"+("@use '@angular/cdk' as cdk;\n" if group!='panel' else '')+setup[setup.index('\n')+1:]
    if group=='dark':program+='$theme: peer.m2-define-dark-theme($primary, $accent);\n'
    blocks=[]
    for f in fs:
        selected=[d for d in ds if d!='density'] if f=='datepicker' else ds
        controls=' .mat-calendar-controls { @include peer.icon-button-overrides((touch-target-display: none)); .mat-mdc-icon-button.mat-mdc-button-base { @include peer.icon-button-overrides((state-layer-size: 40px)); } }' if f=='datepicker' and 'density' in ds else ''
        blocks.append(_marker(group,f,'begin')+'\n'+(scope+' { ' if scope else '')+' '.join(f'@include peer.{f}-{d}($theme);' for d in ['base']+selected)+controls+(' }' if scope else '')+'\n'+_marker(group,f,'end'))
    program+='\n'.join(blocks)+'\n'
    if group!='panel':program+=_marker(group,'current-high-contrast','begin')+'\n'+(scope+' ' if scope else '')+'.mat-badge-content { @include cdk.high-contrast(active) { outline: solid 1px; border-radius: 0; } }\n'+_marker(group,'current-high-contrast','end')+'\n'+_marker(group,'current-progress-color','begin')+'\n'+(scope+' { ' if scope else '')+'@include peer.progress-bar-color($theme);'+(' }' if scope else '')+'\n'+_marker(group,'current-progress-color','end')+'\n'
    return program

_identity=json.loads((ROOT/'compatibility/rc/original16-sass-source-diagnostic-identity.json').read_bytes())
_known={(s['path'],s['sha256'],s['bytes']) for ss in _identity['loaded_source_sets'].values() for s in ss}
for _group,_p in _CATALOG['profiles'].items():
    _fs=['expansion'] if _group=='panel' else _FAMILIES;_scope='' if _group=='light' else '.dark-shell' if _group=='dark' else '.single-panel';_ds=['color','density'] if _group=='dark' else ['color','typography','density']
    _argument='mat.define-dark-theme($primary, $accent)' if _group=='dark' else '$theme'
    _program=_PRELUDE+'\n'.join((f'@include mat.{f}-theme($theme);\n' if _group=='dark' else '')+_marker(_group,f,'begin')+'\n'+(_scope+' { ' if _scope else '')+f'@include mat.{f}-theme({_argument});'+(' }' if _scope else '')+'\n'+_marker(_group,f,'end') for f in _fs)+'\n'
    if (_p['scope']!=_scope or _p['dimensions']!=_ds or _p['families']!=_fs or _p['public_families']!=(_fs if _group=='panel' else _fs+['current-high-contrast','current-progress-color'])
        or _p['original_program']!=_program or _p['original_program_sha256']!=_sha(_program) or _p['peer_program']!=ordered_aggregate_peer_program(_group)
        or list(_p['originals'])!=_fs or any(_sha(m['css'])!=m['css_sha256'] or len(m['css'].encode())!=m['css_bytes'] for m in _p['originals'].values())
        or any(p['program_sha256']!=_sha(_p['peer_program']) for p in _p['peers'].values())
        or not _p['original_sources'] or any((s['path'],s['sha256'],s['bytes']) not in _known for s in _p['original_sources'])):raise ValueError('ordered aggregate profile or original source changed')
if not _CATALOG['original_sources'] or any((s['path'],s['sha256'],s['bytes']) not in _known for s in _CATALOG['original_sources']):raise ValueError('ordered aggregate original sources not authenticated')

def _members(group,peer,line):
    p=_CATALOG['profiles'][group];floor=p['peers'][line];inputs=_CATALOG['peer_inputs'][line]
    if (not peer_measurement_ok(peer,line,floor['program_sha256'],{}) or peer['program']!=p['peer_program'] or peer['css_sha256']!=floor['css_sha256'] or peer['css_bytes']!=floor['css_bytes']
        or peer['cdk_version']!=inputs['cdk_version'] or peer['cdk_version']!=peer['peer_version'] or peer['cdk_package_json_sha256']!=inputs['cdk_package_json_sha256']
        or len(peer['sources'])!=len(inputs['sources']) or any(s not in peer['sources'] for s in inputs['sources'])):return None
    out={}
    for f in p['public_families']:
        a=_marker(group,f,'begin');b=_marker(group,f,'end')
        if peer['css'].count(a)!=1 or peer['css'].count(b)!=1:return None
        out[f]=peer['css'].split(a)[1].split(b)[0].strip()
    return out

def _root_blocks(css):
    pattern=r'(?m)^html \{\n((?:  --[^\n]+;\n)+)\}\n\nhtml \{\n((?:  --[^\n]+;\n)+)\}'
    while re.search(pattern,css):css=re.sub(pattern,lambda m:'html {\n'+m[1]+m[2]+'}',css)
    return css

def _parent(scope,*parts):
    opening=(scope or 'html')+' {\n';values=[p for p in parts if p]
    if not values or any(not p.startswith(opening) or not p.endswith('\n}') or p.count(opening)!=1 for p in values):return None
    return opening+'\n'.join(p[len(opening):-2] for p in values)+'\n}'

def _theme_model(group,p):
    profile=_CATALOG['profiles'][group];css=_CATALOG['parts'][group];scope=profile['scope'];lead=scope+' ' if scope else '';o={f:m['css'] for f,m in profile['originals'].items()}
    if not scope:p={f:_root_blocks(body) for f,body in p.items()}
    order=[f for f in _FAMILIES if o[f]];pos=[css.find(o[f]) for f in order]
    if any(css.count(o[f])!=1 for f in order):return None
    sep={f:css[pos[i]+len(o[f]):pos[i+1]] for i,f in enumerate(order[:-1])}
    if any(v not in ['\n','\n\n'] for v in sep.values()):return None
    start=pos[0];tail=''.join(o[f]+(sep[f] if i<len(order)-1 else '') for i,f in enumerate(order))
    if css[start:]!=tail or p['grid-list']!=o['grid-list']:return None
    prefix=css[:start]
    if '--mdc-linear-progress-active-indicator-color' in prefix:return None
    separator='\n' if scope else '\n\n';badge=o['badge'];hc='.cdk-high-contrast-active '+lead+'.mat-badge-content {\n  outline: solid 1px;\n  border-radius: 0;\n}'
    if not scope:
        if badge.count('  border-radius: 50%;')!=1 or badge.count(hc+'\n\n')!=1:return None
        badge=badge.replace('  border-radius: 50%;','  border-radius: var(--mat-badge-container-shape, 50%);')
        for size,value,geometry,height in [('small',16,'legacy-small-size-container-size','small-size-line-height'),('medium',22,'legacy-container-size','line-height'),('large',28,'legacy-large-size-container-size','large-size-line-height')]:
            old=f'{lead}.mat-badge-{size} .mat-badge-content {{\n  width: {value}px;\n  height: {value}px;\n  line-height: {value}px;'
            if badge.count(old)!=1:return None
            badge=badge.replace(old,f'{lead}.mat-badge-{size} .mat-badge-content {{\n  width: var(--mat-badge-{geometry}, {value}px);\n  height: var(--mat-badge-{geometry}, {value}px);\n  line-height: var(--mat-badge-{height}, {value}px);')
        badge=badge.replace(hc+'\n\n',hc+'\n\n'+p['current-high-contrast']+'\n\n')
    elif 'border-radius' in badge:return None
    badge+=separator+p['badge'];added=lambda f:o[f]+'\n\n'+p[f]
    expansion=_parent(scope,p['expansion'],p['grid-list']) if scope else p['expansion']
    if expansion is None:return None
    datepicker=o['datepicker']
    calendar=f'{lead}.mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base {{\n  --mdc-icon-button-state-layer-size: 40px;\n  width: var(--mdc-icon-button-state-layer-size);\n  height: var(--mdc-icon-button-state-layer-size);\n  padding: 8px;\n}}\n{lead}.mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base .mat-mdc-button-touch-target {{\n  display: none;\n}}'
    fallback=f'{lead}.mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base {{\n  width: var(--mat-icon-button-state-layer-size, var(--mdc-icon-button-state-layer-size));\n  height: var(--mat-icon-button-state-layer-size, var(--mdc-icon-button-state-layer-size));\n}}\n{lead}.mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base .mat-mdc-button-touch-target {{\n  display: var(--mat-icon-button-touch-target-display, none);\n}}'
    if datepicker.count(calendar)!=1:return None
    datepicker=datepicker.replace(calendar,calendar+'\n'+fallback)+separator+p['datepicker']
    sort=re.sub(r'^  color: ([^;\n]+);$',lambda m:'  color: var(--mat-sort-arrow-color, '+m[1]+');',o['sort'],flags=re.M)+separator+p['sort']
    tokens={'background':'container-background-color','color':'node-text-color','font-weight':'node-text-weight','font-size':'node-text-size','min-height':'node-min-height'}
    tree=re.sub(r'^  (background|color|font-weight|font-size|min-height): ([^;\n]+);$',lambda m:'  '+m[1]+': var(--mat-tree-'+tokens[m[1]]+', '+m[2]+');',o['tree'],flags=re.M)+separator+p['tree']
    pieces=[badge,added('bottom-sheet'),added('button-toggle'),datepicker,added('divider'),o['expansion']+'\n\n'+expansion]
    if not scope:pieces.append(o['grid-list'])
    pieces.extend([o['icon'],added('sidenav'),added('stepper'),sort,added('toolbar'),tree])
    return prefix+separator.join(pieces)

def ordered_aggregate_expected_css(peers,line):
    try:
        if set(peers)!=set(['core']+_GROUPS) or peers['core']['line']!=line:return None
        core=ordered_core_expected_css('02-core',peers['core'],line);parts={g:_members(g,peers[g],line) for g in _GROUPS}
        if core is None or any(p is None for p in parts.values()):return None
        light=_theme_model('light',parts['light']);dark=_theme_model('dark',parts['dark'])
        if light is None or dark is None:return None
        css=core+'\n'+'\n\n'.join([light,dark,_CATALOG['parts']['panel']+'\n\n'+parts['panel']['expansion']])
        return insert_ripple_color_in_expected_model('06-aggregate-and-companions',css,peers['light'],aggregate=True)
    except (KeyError,TypeError,ValueError,AttributeError):return None

def ordered_aggregate_assertion_ok(body):
    if not ripple_color_measurement_ok('06-aggregate-and-companions',body.get('actual_measurement'),body.get('line')):return False
    try:
        if body['case_id']!=_CASE or 'current_infrastructure' in body:return False
        line=body['line'];m=body['actual_measurement'];c=body['current_companion'];e=_ENTRY
        if (c['classification']!='conforming-current-companion' or c['contract']!=ORDERED_AGGREGATE_CONTRACT or body['comparison']!=ORDERED_AGGREGATE_CONTRACT
            or body['raw_status']!='blocked' or body['status']!='conforming-current-companion' or body['baseline_sha256']!=e['reference_sha256'] or body['candidate_sha256']!=m['css_sha256']
            or body['fixture']!=e['fixture'] or body['fixture_sha256']!=e['fixture_sha256'] or body['reference']!=e['reference'] or body['reference_sha256']!=e['reference_sha256']):return False
        if (m['line']!=line or line not in _CATALOG['peer_inputs'] or m['program_sha256']!=e['program_sha256'] or m['css_sha256']!=_sha(m['css'])
            or type(m['css_bytes']) is not int or m['css_bytes']!=len(m['css'].encode()) or not m['sass_version'].startswith('dart-sass\t1.104.1\t')):return False
        ss=m['sources']
        if (not ss or any(type(s['root']) is not int or s['root'] not in (0,1,2) or not s['path'] or s['path'].startswith('/') or '\\' in s['path']
            or '..' in s['path'].split('/') or not re.fullmatch('[0-9a-f]{64}',s['sha256']) or type(s['bytes']) is not int or s['bytes']<1 for s in ss)
            or len({(s['root'],s['path']) for s in ss})!=len(ss)):return False
        if not all(any(s['root']==0 and s['path']==p for s in ss) for p in ['_index.scss','styles/core/_core.scss','styles/core/theming/_theming.scss','styles/legacy-core/theming/_all-theme.scss','styles/bridges/_companion-overrides.scss']):return False
        expected=ordered_aggregate_expected_css(c['peers'],line)
        return expected is not None and expected==m['css']
    except (KeyError,TypeError,ValueError,AttributeError):return False

def ordered_aggregate_envelope_ok(active,body,invocation):
    try:
        expected=dict(kind='assertion',check_id='sass-seal',group='ordered-css-dom',result='pass',exit_code=0,line=active.binding['source_line'],run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding)
        if any(body.get(k)!=v or type(body.get(k))!=type(v) for k,v in expected.items()):return False
        library=[a for a in active.manifest['artifacts'] if a['id']=='library']
        return len(library)==1 and body['tarball_sha256']==library[0]['sha256'] and ordered_aggregate_assertion_ok(body)
    except (KeyError,TypeError,ValueError,AttributeError):return False
