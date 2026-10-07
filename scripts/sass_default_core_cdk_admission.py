"""Five finite default core cases; preserve all owned CSS around public CDK."""
import hashlib
import json
import re
from pathlib import Path
from sass_current_companion_admission import peer_measurement_ok
_ROOT=Path(__file__).resolve().parents[1]
_CATALOG=json.loads((_ROOT/'fixtures/sass/default-core-cdk-contracts.json').read_bytes())
DEFAULT_CORE_CDK_CASES=_CATALOG['cases']
DEFAULT_CORE_CDK_CONTRACT='historical-core-with-public-cdk-contributions'
_IDS={'mixin-css/'+n for n in ['core','legacy-core','ripple','private-menu-common-item-submenu-icon','private-strong-focus-indicators-structural-styling']}
_sha=lambda s:hashlib.sha256(s.encode()).hexdigest()
_bytes=(_ROOT/'compatibility/rc/oracles/material-16.2.14-sass-api.json').read_bytes();_oracle=json.loads(_bytes)
if (_CATALOG['schema_version']!=1 or set(DEFAULT_CORE_CDK_CASES)!=_IDS
    or hashlib.sha256(_bytes).hexdigest()!=_CATALOG['oracle_sha256']
    or any(e['original_sha256']!=_oracle['members']['mixins'][k[10:]]['invocation']['css_sha256']
        or e['original_bytes']!=_oracle['members']['mixins'][k[10:]]['invocation']['css_bytes']
        or _sha(e['original_css'])!=e['original_sha256'] for k,e in DEFAULT_CORE_CDK_CASES.items())):
    raise ValueError('finite default core/CDK scope changed')
_ORDER=['a11y-visually-hidden','overlay','text-field-autosize','text-field-autofill']
_NAMES=['ripple_force','focus_mat_force','focus_mdc_force','root_focus_mat_force','root_focus_mdc_force','menu_force']+_ORDER

def _parts(peer,line):
    try:
        floor=_CATALOG['peers'][line]
        if (not peer_measurement_ok(peer,line,floor['program_sha256'],{}) or peer['css_sha256']!=floor['css_sha256']
            or peer['cdk_version']!=floor['cdk_version'] or peer['cdk_package_json_sha256']!=floor['cdk_package_json_sha256']
            or len(peer['sources'])!=len(floor['sources']) or any(s not in peer['sources'] for s in floor['sources'])):return None
        result={}
        for n in _NAMES:
            start=f'/*!__core_cdk_{n}_begin__*/';end=f'/*!__core_cdk_{n}_end__*/'
            if peer['css'].count(start)!=1 or peer['css'].count(end)!=1:return None
            result[n]=peer['css'].split(start)[1].split(end)[0].strip()
        return result
    except (KeyError,TypeError,ValueError,AttributeError):return None

def _focus(css,root,p):
    boundary='\n\n'+('' if root else '.sass-api-probe ')+'.mat-mdc-focus-indicator {'
    if css.count(boundary)!=1:return None
    first,second=css.split(boundary)
    return first+'\n\n'+p[('root_' if root else '')+'focus_mat_force']+'\n'+boundary[2:]+second+'\n\n'+p[('root_' if root else '')+'focus_mdc_force']

def default_core_cdk_expected_css(case_id,peer,line):
    try:
        entry=DEFAULT_CORE_CDK_CASES[case_id];p=_parts(peer,line)
        if p is None:return None
        old=entry['original_css']
        if case_id=='mixin-css/ripple':return old+'\n\n'+p['ripple_force']
        if case_id=='mixin-css/private-menu-common-item-submenu-icon':return old+'\n\n'+p['menu_force']
        if case_id=='mixin-css/private-strong-focus-indicators-structural-styling':return _focus(old,True,p)
        ripple=DEFAULT_CORE_CDK_CASES['mixin-css/ripple']['original_css']
        if not old.startswith(ripple):return None
        previous=len(ripple);separators={}
        for n in _ORDER:
            member=_CATALOG['original_cdk_members'][n]
            if not member or old.count(member)!=1:return None
            start=old.index(member);separators[n]=old[previous:start]
            if separators[n] not in ['\n','\n\n']:return None
            previous=start+len(member)
        tail=old[previous:]
        if not tail.startswith('\n.sass-api-probe .mat-focus-indicator {'):return None
        owned_focus=_focus(tail[1:],False,p)
        if owned_focus is None:return None
        # Only the four borrowed members and their precise media boundary
        # compose; the whole historical owned ripple/focus bodies stay exact.
        return ripple+'\n\n'+p['ripple_force']+''.join(('\n' if n=='a11y-visually-hidden' else separators[n])+p[n] for n in _ORDER)+'\n'+owned_focus
    except (KeyError,TypeError,ValueError,AttributeError):return None

def default_core_cdk_assertion_ok(body):
    try:
        case=body['case_id'];entry=DEFAULT_CORE_CDK_CASES[case];line=body['line'];contract=body['current_infrastructure'];m=body['actual_measurement']
        if (contract['classification']!='conforming-current-infrastructure' or contract['contract']!=DEFAULT_CORE_CDK_CONTRACT
            or body['comparison']!=DEFAULT_CORE_CDK_CONTRACT or body['expected_sha256']!=entry['original_sha256'] or body['expected_bytes']!=entry['original_bytes']):return False
        if (m['line']!=line or m['program_sha256']!=entry['program_sha256'] or m['css_sha256']!=_sha(m['css'])
            or type(m['css_bytes']) is not int or m['css_bytes']!=len(m['css'].encode())
            or not m['sass_version'].startswith('dart-sass\t1.104.1\t')
            or body['actual_sha256']!=m['css_sha256'] or body['actual_bytes']!=m['css_bytes']):return False
        sources=m['sources']
        if (not sources or any(type(s['root']) is not int or s['root'] not in (0,1,2) or not s['path'] or s['path'].startswith('/')
            or '\\' in s['path'] or '..' in s['path'].split('/') or not re.fullmatch('[0-9a-f]{64}',s['sha256']) or type(s['bytes']) is not int or s['bytes']<1 for s in sources)
            or len({(s['root'],s['path']) for s in sources})!=len(sources)):return False
        required=['_index.scss','styles/core/style/_high-contrast.scss']
        if case in ['mixin-css/core','mixin-css/legacy-core','mixin-css/ripple']:required.append('styles/core/ripple/_ripple.scss')
        if case in ['mixin-css/core','mixin-css/legacy-core','mixin-css/private-strong-focus-indicators-structural-styling']:required.append('styles/core/focus-indicators/_private.scss')
        if case=='mixin-css/private-menu-common-item-submenu-icon':required.append('styles/core/style/_menu-common.scss')
        if not all(any(s['root']==0 and s['path']==path for s in sources) for path in required):return False
        expected=default_core_cdk_expected_css(case,contract['peer'],line)
        return expected is not None and expected==m['css']
    except (KeyError,TypeError,ValueError,AttributeError):return False

def default_core_cdk_envelope_ok(active,body,invocation):
    try:
        envelope=dict(kind='assertion',check_id='sass-seal',group='sass-api-and-values',result='pass',exit_code=0,
            line=active.binding['source_line'],run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,
            oracle='compatibility/rc/oracles/material-16.2.14-sass-api.json',oracle_sha256=_CATALOG['oracle_sha256'])
        if any(body.get(k)!=v or type(body.get(k))!=type(v) for k,v in envelope.items()):return False
        library=[a for a in active.manifest['artifacts'] if a['id']=='library']
        return len(library)==1 and body['tarball_sha256']==library[0]['sha256'] and default_core_cdk_assertion_ok(body)
    except (KeyError,TypeError,ValueError,AttributeError):return False
