"""Thirty-one default companion cases retain whole original CSS and exact public peers."""
import hashlib,json,re
from pathlib import Path
from sass_stepper_historical_model import historical_stepper_peer_css
from sass_current_companion_admission import peer_measurement_ok
ROOT=Path(__file__).resolve().parents[1]
_CATALOG=json.loads((ROOT/'fixtures/sass/default-companion-contracts.json').read_bytes())
DEFAULT_COMPANION_CASES=_CATALOG['cases']
DEFAULT_COMPANION_CONTRACT='historical-default-css-with-public-companion-addition'
_SCOPES={**dict.fromkeys(['bottom-sheet','button-toggle','divider','expansion','sidenav','stepper'],['color','typography','density','theme']),'badge':['color','typography','density'],'datepicker':['color','typography'],'toolbar':['color','theme']}
_IDS={f'mixin-css/{family}-{d}' for family,dimensions in _SCOPES.items() for d in dimensions}
_sha=lambda s:hashlib.sha256(s.encode()).hexdigest()
raw=(ROOT/'compatibility/rc/oracles/material-16.2.14-sass-api.json').read_bytes();_ORACLE=json.loads(raw)
_PEER_SETUP=_ORACLE['standard_theme'].replace('m.define-','peer.m2-define-').replace('m.$','peer.$m2-')
if _CATALOG['peer_setup']!=_PEER_SETUP:raise ValueError('default companion peer theme changed')
_SOURCESETS={line:{(s['root'],s['path'],s['sha256'],s['bytes']) for s in v['sources']} for line,v in _CATALOG['peer_inputs'].items()}
if _CATALOG['schema_version']!=1 or hashlib.sha256(raw).hexdigest()!=_CATALOG['oracle_sha256'] or set(DEFAULT_COMPANION_CASES)!=_IDS:raise ValueError('finite default companion scope changed')
for case,e in DEFAULT_COMPANION_CASES.items():
    name=case[10:];inv=_ORACLE['members']['mixins'][name]['invocation'];dimension=name[len(e['family'])+1:]
    dimensions=['color','typography','density'] if dimension=='theme' else [dimension]
    program="@use '__entry__' as m;\n"+_ORACLE['standard_theme']+'\n'+e['call']+'\n'
    separator='\n' if case in ['mixin-css/badge-color','mixin-css/datepicker-color','mixin-css/toolbar-color'] else '\n\n'
    peer_program="@use '@angular/material' as peer;\n"+_PEER_SETUP+'\n.sass-api-probe { '+' '.join(f'@include peer.{e["family"]}-{d}($__theme);' for d in ['base']+dimensions)+' }\n'
    if any(floor['program_sha256']!=_sha(peer_program) for floor in e['peers'].values()):raise ValueError('default companion peer program changed')
    if (name!=e['family']+'-'+dimension or e['family'] not in _SCOPES or dimension not in _SCOPES[e['family']] or e['dimensions']!=dimensions
        or e['call']!=f'.sass-api-probe {{ @include m.{name}($__theme); }}' or e['program_sha256']!=_sha(program)
        or e['original_sha256']!=inv['css_sha256'] or e['original_bytes']!=inv['css_bytes'] or _sha(e['original_css'])!=inv['css_sha256']
        or len(e['original_css'].encode())!=e['original_bytes'] or e['separator']!=separator):raise ValueError('finite default companion original contract changed')

def default_companion_expected_css(case,peer,line):
    try:
        e=DEFAULT_COMPANION_CASES[case];floor=e['peers'][line];inputs=_CATALOG['peer_inputs'][line]
        if (not peer_measurement_ok(peer,line,floor['program_sha256'],{}) or peer['css_sha256']!=floor['css_sha256']
            or peer['cdk_version']!=peer['peer_version'] or peer['cdk_version']!=inputs['cdk_version'] or peer['cdk_package_json_sha256']!=inputs['cdk_package_json_sha256']
            or len(peer['sources'])!=len(inputs['sources']) or {(s['root'],s['path'],s['sha256'],s['bytes']) for s in peer['sources']}!=_SOURCESETS[line]):return None
        addition=historical_stepper_peer_css(peer['css'],e['original_css'],line,'color' in e['dimensions']) if e['family']=='stepper' else peer['css']
        if addition is None:return None
        return (e['original_css']+e['separator'] if e['original_css'] else '')+addition
    except (KeyError,TypeError,ValueError,AttributeError):return None

def default_companion_assertion_ok(body):
    try:
        e=DEFAULT_COMPANION_CASES[body['case_id']];m=body['actual_measurement'];c=body['current_companion'];line=body['line']
        if ('current_infrastructure' in body or body['comparison']!=DEFAULT_COMPANION_CONTRACT or c['classification']!='conforming-current-companion'
            or c['contract']!=DEFAULT_COMPANION_CONTRACT or type(body['expected_bytes']) is not int or type(body['actual_bytes']) is not int or body['expected_sha256']!=e['original_sha256'] or body['expected_bytes']!=e['original_bytes']):return False
        if (m['line']!=line or m['program_sha256']!=e['program_sha256'] or m['css_sha256']!=_sha(m['css']) or type(m['css_bytes']) is not int
            or m['css_bytes']!=len(m['css'].encode()) or not m['sass_version'].startswith('dart-sass\t1.104.1\t')
            or body['actual_sha256']!=m['css_sha256'] or body['actual_bytes']!=m['css_bytes']):return False
        ss=m['sources']
        if (not ss or any(type(s['root']) is not int or s['root'] not in (0,1,2) or not s['path'] or s['path'].startswith('/') or '\\' in s['path']
            or '..' in s['path'].split('/') or not re.fullmatch('[0-9a-f]{64}',s['sha256']) or type(s['bytes']) is not int or s['bytes']<1 for s in ss)
            or len({(s['root'],s['path']) for s in ss})!=len(ss)):return False
        if not all(any(s['root']==0 and s['path']==path for s in ss) for path in ['_index.scss','styles/bridges/_companion-overrides.scss','styles/bridges/_m2-system.scss','styles/core/theming/_theming.scss']):return False
        expected=default_companion_expected_css(body['case_id'],c['peer'],line)
        return expected is not None and expected==m['css']
    except (KeyError,TypeError,ValueError,AttributeError):return False

def default_companion_envelope_ok(active,body,invocation):
    try:
        fields=dict(kind='assertion',check_id='sass-seal',group='sass-api-and-values',result='pass',exit_code=0,line=active.binding['source_line'],run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,
            oracle='compatibility/rc/oracles/material-16.2.14-sass-api.json',oracle_sha256=_CATALOG['oracle_sha256'])
        if any(body.get(k)!=v or type(body.get(k))!=type(v) for k,v in fields.items()):return False
        library=[a for a in active.manifest['artifacts'] if a['id']=='library']
        return len(library)==1 and body['tarball_sha256']==library[0]['sha256'] and default_companion_assertion_ok(body)
    except (KeyError,TypeError,ValueError,AttributeError):return False
