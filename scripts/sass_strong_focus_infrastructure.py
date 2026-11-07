# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact tagged-16 focus declarations and independently measured peer output."""
import hashlib,json,re
from pathlib import Path
from sass_current_companion_admission import peer_measurement_ok
ROOT=Path(__file__).resolve().parents[1]
_HELPERS=(Path(__file__),ROOT/'scripts/sass-strong-focus-infrastructure.mjs')
_IMAGES=tuple(p.read_bytes() for p in _HELPERS)
def helpers_current():return all(not p.is_symlink() and p.read_bytes()==image for p,image in zip(_HELPERS,_IMAGES))
def plain(v):
    if v is None or type(v) in (str,bool,int):return v
    if type(v) is list:return [plain(x) for x in v]
    if type(v) is dict:
        if not all(type(k) is str for k in v):raise ValueError('keys')
        return {k:plain(x) for k,x in v.items()}
    raise ValueError('not plain data')
sha=lambda x:hashlib.sha256(x.encode() if isinstance(x,str) else x).hexdigest()
raw=(ROOT/'fixtures/sass/strong-focus-infrastructure-contract.json').read_bytes()
if sha(raw)!='f68bcd081af1bee541301b2941dd7ae0639eb71e0323ba7b1d357975802b64d8':raise ValueError('focus catalog changed')
C=json.loads(raw);FINGERPRINT=sha(json.dumps(C,sort_keys=True,separators=(',',':')));CASE='mixin-css/strong-focus-indicators';CONTRACT='historical-strong-focus-with-public-peer'
if C['schema_version']!=1 or C['tag']!='16.2.14' or C['tag_commit']!='df60e733c60e572ba538f6ad0ceff3e63e527b53' or C['peer_version']!='22.1.7' or [x['name'] for x in C['cases']]!=['default','custom','null','false','variable','display-null','display-none','repeat'] or len(C['peer_sources'])!=186 or len(C['measurement_sources'])!=472 or C['tag_sources']!=[{'path':'src/material/core/focus-indicators/_focus-indicators.scss','git_blob':'785745a2805286d2bd0ebb8ebdb9da472b0017f5','sha256':'c4ec1054f22f17faf475253a301e58e16e2630a263cebd92dc00ee660d80073f','bytes':177},{'path':'src/material/core/focus-indicators/_private.scss','git_blob':'8cd7070e7cd0571851ed3a6d84329d2a3033834d','sha256':'a8d9045dc9725c5867e82b82fc13d6a5ec92799627a63a1552786fdf2c9416e4','bytes':5448}] or C['cases'][0]['original_sha256']!='970c1320258c556de56a431db038cf02c8d1fa487a010fa9ef460e74ca51cb35' or any(sha(x['original_css'])!=x['original_sha256'] or sha(x['peer_program'])!=x['peer_program_sha256'] or sha(x['peer_css'])!=x['peer_css_sha256'] for x in C['cases']):raise ValueError('focus catalog scope')
def expected(c,p):
    if not peer_measurement_ok(p,'main',c['peer_program_sha256'],{}) or p.get('program')!=c['peer_program'] or p.get('peer_version')!=C['peer_version'] or p.get('peer_package_json_sha256')!=C['peer_package_json_sha256'] or p.get('css')!=c['peer_css'] or p.get('sources')!=C['peer_sources']:return None
    prefix=c['selector']+' {';old=c['original_css'];peer=p['css']
    if not old.startswith(prefix) or not old.endswith('}') or not peer.startswith(prefix):return None
    return '\n'.join([old[:-2]+peer[len(prefix):]]*c['count'])
def source_ok(m):
    try:
        if type(m) is not dict or m['line']!='main' or type(m['css']) is not str or m['css_sha256']!=sha(m['css']) or m['css_bytes']!=len(m['css'].encode()) or not m['sass_version'].startswith('dart-sass\t1.104.1\t') or type(m['sources']) is not list or not m['sources']:return False
        ss=m['sources'];required=[('_index.scss',None),('styles/core/focus-indicators/_focus-indicators.scss','e2ad7e073a9dd1954dc85a5816cc5f9c05644b9d441abc1359847b31b30f7f73'),('styles/core/focus-indicators/_private.scss','308b728b247ebfa673527ab6a3023e26fc818f40eb0e0d65b134eda97d6ccd8f')]
        return ss==C['measurement_sources'] and len({(s['root'],s['path']) for s in ss})==len(ss) and all(any(s['root']==0 and s['path']==path and (digest is None or s['sha256']==digest) for s in ss) for path,digest in required) and all(type(s['root']) is int and s['root'] in (0,1,2) and type(s['path']) is str and s['path'] and not s['path'].startswith('/') and '..' not in s['path'] and '\\' not in s['path'] and re.fullmatch('[0-9a-f]{64}',s['sha256']) and type(s['bytes']) is int and s['bytes']>0 for s in ss)
    except (KeyError,TypeError,ValueError):return False
def focus_assertion_ok(body):
    try:
        path=ROOT/'fixtures/sass/strong-focus-infrastructure-contract.json'
        if not helpers_current() or any(p.is_symlink() for p in (ROOT/'fixtures',ROOT/'fixtures/sass',path)) or sha(path.read_bytes())!=sha(raw) or sha(json.dumps(C,sort_keys=True,separators=(',',':')))!=FINGERPRINT:return False
        body=plain(body)
        m=body['actual_measurement'];c=body['current_infrastructure']
        if body['case_id']!=CASE or body['line']!='main' or body['comparison']!=CONTRACT or c['classification']!='conforming-current-infrastructure' or c['contract']!=CONTRACT or not source_ok(m) or m['program_sha256']!=C['default_program_sha256'] or body['expected_sha256']!=C['cases'][0]['original_sha256'] or body['expected_bytes']!=len(C['cases'][0]['original_css'].encode()) or body['actual_sha256']!=m['css_sha256'] or body['actual_bytes']!=m['css_bytes'] or len(c['variants'])!=8 or len(c['peers'])!=8:return False
        for i,case in enumerate(C['cases']):
            v=c['variants'][i];e=expected(case,c['peers'][i]);vm=v['measurement']
            if e is None or v['name']!=case['name'] or not source_ok(vm) or vm['program_sha256']!=case['program_sha256'] or vm['sources']!=m['sources'] or vm['css']!=e:return False
        return m['css']==expected(C['cases'][0],c['peers'][0]) and helpers_current()
    except (KeyError,TypeError,ValueError,AttributeError,OSError,RecursionError):return False
def focus_envelope_ok(active,body,invocation,oracle_sha):
    try:
        if oracle_sha!='76908825fdbb55fc188f0add372d371f473cd7874cbf575894247231ab854e2d':return False
        envelope=dict(kind='assertion',check_id='sass-seal',group='sass-api-and-values',result='pass',exit_code=0,line=active.binding['source_line'],run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,oracle='compatibility/rc/oracles/material-16.2.14-sass-api.json',oracle_sha256=oracle_sha)
        if any(body.get(k)!=v or type(body.get(k))!=type(v) for k,v in envelope.items()) or 'current_companion' in body:return False
        library=[a for a in active.manifest['artifacts'] if a['id']=='library']
        return len(library)==1 and body['tarball_sha256']==library[0]['sha256'] and focus_assertion_ok(body)
    except (KeyError,TypeError,ValueError,AttributeError,OSError,RecursionError):return False
