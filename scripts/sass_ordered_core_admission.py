"""Two root core fixtures retain complete historical owned CSS around public CDK."""
import hashlib,json,re
from pathlib import Path
from sass_current_companion_admission import peer_measurement_ok
ROOT=Path(__file__).resolve().parents[1]
_CATALOG=json.loads((ROOT/'fixtures/sass/ordered-core-cdk-contracts.json').read_bytes())
ORDERED_CORE_CASES=_CATALOG['cases']
ORDERED_CORE_CONTRACT='historical-ordered-core-with-public-cdk-contributions'
_RECIPES={'02-core':"@use '@angular/material' as mat;\n@include mat.core();\n",'03-legacy-core':"@use '@angular/material' as mat;\n@include mat.legacy-core();\n"}
_sha=lambda s:hashlib.sha256(s.encode()).hexdigest()
_ORIGINALS={}
if _CATALOG['schema_version']!=1 or set(ORDERED_CORE_CASES)!=set(_RECIPES):raise ValueError('ordered core scope changed')
for case,source in _RECIPES.items():
    e=ORDERED_CORE_CASES[case];raw=(ROOT/e['reference']).read_bytes()
    if (e['reference']!=f'reference/material-16.2.14/sass-css/{case}.css' or e['fixture']!=f'fixtures/sass/{case}.scss'
        or e['fixture_sha256']!=_sha(source) or e['program_sha256']!=_sha(source.replace("'@angular/material'","'__entry__'"))
        or e['reference_sha256']!='fac41823e947b8730a19e2386dfedd984703692b7ddbf701a767240774407de8'
        or hashlib.sha256(raw).hexdigest()!=e['reference_sha256'] or len(raw)!=e['reference_bytes']):raise ValueError('ordered core frozen inputs changed')
    _ORIGINALS[case]=raw.decode()
_ORDER=['a11y-visually-hidden','overlay','text-field-autosize','text-field-autofill']
_NAMES=['ripple_force','focus_mat_force','focus_mdc_force']+_ORDER

def _parts(peer,line):
    try:
        floor=_CATALOG['peers'][line]
        if (not peer_measurement_ok(peer,line,floor['program_sha256'],{}) or peer['css_sha256']!=floor['css_sha256']
            or peer['cdk_version']!=floor['cdk_version'] or peer['cdk_package_json_sha256']!=floor['cdk_package_json_sha256']
            or len(peer['sources'])!=len(floor['sources']) or any(s not in peer['sources'] for s in floor['sources'])):return None
        p={}
        for n in _NAMES:
            begin=f'/*!__ordered_core_cdk_{n}_begin__*/';end=f'/*!__ordered_core_cdk_{n}_end__*/'
            if peer['css'].count(begin)!=1 or peer['css'].count(end)!=1:return None
            p[n]=peer['css'].split(begin)[1].split(end)[0].strip()
        return p
    except (KeyError,TypeError,ValueError,AttributeError):return None

def ordered_core_expected_css(case,peer,line):
    try:
        old=_ORIGINALS[case];p=_parts(peer,line);ripple=_CATALOG['original_ripple']
        if p is None or not old.startswith(ripple):return None
        previous=len(ripple)
        for n in _ORDER:
            member=_CATALOG['original_cdk_members'][n]
            if not member or old.count(member)!=1:return None
            start=old.index(member)
            if old[previous:start]!='\n\n':return None
            previous=start+len(member)
        tail=old[previous:];boundary='\n\n.mat-mdc-focus-indicator {'
        if not tail.startswith('\n\n.mat-focus-indicator {') or tail[2:].count(boundary)!=1:return None
        mat,mdc=tail[2:].split(boundary)
        return ripple+'\n\n'+p['ripple_force']+''.join('\n\n'+p[n] for n in _ORDER)+'\n\n'+mat+'\n\n'+p['focus_mat_force']+'\n'+boundary[2:]+mdc+'\n\n'+p['focus_mdc_force']
    except (KeyError,TypeError,ValueError,AttributeError):return None

def ordered_core_assertion_ok(body):
    try:
        case=body['case_id'];e=ORDERED_CORE_CASES[case];line=body['line'];m=body['actual_measurement'];c=body['current_infrastructure']
        if (c['classification']!='conforming-current-infrastructure' or c['contract']!=ORDERED_CORE_CONTRACT or body['comparison']!=ORDERED_CORE_CONTRACT
            or body['raw_status']!='blocked' or body['status']!='conforming-current-infrastructure' or body['baseline_sha256']!=e['reference_sha256'] or body['candidate_sha256']!=m['css_sha256']
            or body['fixture']!=e['fixture'] or body['fixture_sha256']!=e['fixture_sha256'] or body['reference']!=e['reference'] or body['reference_sha256']!=e['reference_sha256']):return False
        if (m['line']!=line or m['program_sha256']!=e['program_sha256'] or m['css_sha256']!=_sha(m['css'])
            or type(m['css_bytes']) is not int or m['css_bytes']!=len(m['css'].encode()) or not m['sass_version'].startswith('dart-sass\t1.104.1\t')):return False
        ss=m['sources']
        if (not ss or any(type(s['root']) is not int or s['root'] not in (0,1,2) or not s['path'] or s['path'].startswith('/') or '\\' in s['path']
            or '..' in s['path'].split('/') or not re.fullmatch('[0-9a-f]{64}',s['sha256']) or type(s['bytes']) is not int or s['bytes']<1 for s in ss)
            or len({(s['root'],s['path']) for s in ss})!=len(ss)):return False
        if not all(any(s['root']==0 and s['path']==path for s in ss) for path in ['_index.scss','styles/core/_core.scss','styles/core/style/_high-contrast.scss','styles/core/ripple/_ripple.scss','styles/core/focus-indicators/_private.scss']):return False
        expected=ordered_core_expected_css(case,c['peer'],line)
        return expected is not None and expected==m['css']
    except (KeyError,TypeError,ValueError,AttributeError):return False

def ordered_core_envelope_ok(active,body,invocation):
    try:
        expected=dict(kind='assertion',check_id='sass-seal',group='ordered-css-dom',result='pass',exit_code=0,line=active.binding['source_line'],run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding)
        if any(body.get(k)!=v or type(body.get(k))!=type(v) for k,v in expected.items()):return False
        library=[a for a in active.manifest['artifacts'] if a['id']=='library']
        return len(library)==1 and body['tarball_sha256']==library[0]['sha256'] and ordered_core_assertion_ok(body)
    except (KeyError,TypeError,ValueError,AttributeError):return False
