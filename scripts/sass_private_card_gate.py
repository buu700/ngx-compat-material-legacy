# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""One private-card CSS comparison with historical and current source binding."""
import os as _owner_os, shutil as _owner_shutil, select as _owner_select, time as _owner_time, types as _owner_types
_owner_path=_owner_os.environ.get('PATH','')
_owner_node=_owner_shutil.which('node',path=_owner_path)
if not _owner_node or not _owner_os.path.isabs(_owner_node):raise RuntimeError('pinned Node not found')
_owner_node=_owner_os.path.realpath(_owner_node)
_owner_primitives=(_owner_os.posix_spawn,_owner_os.pipe,_owner_os.close,_owner_os.read,_owner_os.waitpid,_owner_os.kill,_owner_select.select,_owner_time.monotonic)
if any(type(f) is not _owner_types.BuiltinFunctionType for f in _owner_primitives):raise RuntimeError('native owner primitives required')
_owner_spawn,_owner_pipe,_owner_close,_owner_read,_owner_waitpid,_owner_kill,_owner_poll,_owner_clock=_owner_primitives
_owner_dup2=_owner_os.POSIX_SPAWN_DUP2;_owner_close_action=_owner_os.POSIX_SPAWN_CLOSE;_owner_nohang=_owner_os.WNOHANG
_OWNER_LAUNCHER="import {readFileSync,lstatSync} from 'node:fs';import{join,resolve}from'node:path';import{createHash}from'node:crypto';const root=resolve(process.argv[1]),name=process.argv[2],pin=process.argv[3];if(process.version!=='v24.21.0'||!/^scripts\\/[a-z0-9-]+\\.mjs$/.test(name))throw Error('owner launcher');let p=root;for(const x of name.split('/')){p=join(p,x);if(lstatSync(p).isSymbolicLink())throw Error('linked owner')}const raw=readFileSync(p);if(createHash('sha256').update(raw).digest('hex')!==pin)throw Error('owner pin');const extra=process.argv.slice(4);process.argv=[process.argv[0],'owner',root,...extra];await import('data:text/javascript;base64,'+raw.toString('base64'));if(!readFileSync(p).equals(raw))throw Error('owner changed');"

def _native_owner(root,name,pin,extra=(),*,spawn=_owner_spawn,pipe=_owner_pipe,close=_owner_close,read=_owner_read,waitpid=_owner_waitpid,kill=_owner_kill,poll=_owner_poll,clock=_owner_clock,node=_owner_node,path=_owner_path,dup2=_owner_dup2,close_action=_owner_close_action,nohang=_owner_nohang,launcher=_OWNER_LAUNCHER):
    rfd,wfd=pipe();pid=None;waited=False
    try:
        argv=[node,'--input-type=module','--eval',launcher,str(root),name,pin,*extra]
        env={'PATH':path,'LANG':'C','LC_ALL':'C','NODE_OPTIONS':''}
        pid=spawn(node,argv,env,file_actions=[(dup2,wfd,1),(close_action,rfd),(close_action,wfd)])
        close(wfd);wfd=None;output=b'';deadline=clock()+120
        while True:
            remaining=deadline-clock()
            if remaining<=0:raise TimeoutError('owner timeout')
            ready,_,_=poll([rfd],[],[],remaining)
            if not ready:raise TimeoutError('owner timeout')
            part=read(rfd,3)
            if not part:break
            output+=part
            if len(output)>2:raise ValueError('owner protocol')
        while True:
            child,status=waitpid(pid,nohang)
            if child==pid:waited=True;break
            remaining=deadline-clock()
            if remaining<=0:raise TimeoutError('owner timeout')
            poll([],[],[],min(remaining,0.01))
        if status!=0 or output!=b'ok':raise ValueError('owner failed')
    finally:
        if wfd is not None:close(wfd)
        close(rfd)
        if pid is not None and not waited:
            try:kill(pid,9)
            except ProcessLookupError:pass
            waitpid(pid,0)

def _guarded(function,name,own_name=None):
    code=function.__code__;defaults=function.__defaults__;mapping=function.__kwdefaults__;items=tuple(mapping.items()) if mapping else ()
    def check():
        current=function.__kwdefaults__
        if globals().get(name) is not function or function.__code__ is not code or function.__defaults__ is not defaults or current is not mapping or (current is not None and (len(current)!=len(items) or any(k not in current or current[k] is not v for k,v in items))):raise ValueError('changed owner callable')
        if own_name is not None and globals().get(own_name) is not guarded:raise ValueError('changed owner binding')
    def guarded(*args,**kwargs):
        check();result=function(*args,**kwargs);check();return result
    return guarded
_OWNER_NATIVE=(_native_owner,_native_owner.__code__,_native_owner.__defaults__,_native_owner.__kwdefaults__,tuple(_native_owner.__kwdefaults__.items()),_native_owner.__closure__,_owner_spawn,_owner_pipe,_owner_close,_owner_read,_owner_waitpid,_owner_kill,_owner_poll,_owner_clock,_owner_node,_owner_path,_owner_dup2,_owner_close_action,_owner_nohang,_OWNER_LAUNCHER)

def _run_select_owner(root,read,*,native=_OWNER_NATIVE):
    for path in ('compatibility/rc/current-main-select-density-program-v1.json','scripts/select-program-transition-source.mjs','scripts/select_program_transition_source.py'):read(path)
    for path,pin in (('scripts/select-program-transition-source-v2.mjs','57547362588551377bd6b644bf15237943019144e44a7962eacab51cc6685560'),('scripts/select_program_transition_source_v2.py','58dda9df6faf52876bc8c65f5c3037b5b5b56c05e2f7d2470cfa65bb1bd1f9f0')):
        if hashlib.sha256(read(path)).hexdigest()!=pin:raise ValueError('changed current select successor')
    launch,code,defaults,mapping,items,closure,spawn,pipe,close,native_read,waitpid,kill,poll,clock,node,path,dup2,close_action,nohang,launcher=native;current=launch.__kwdefaults__
    if globals().get('_native_owner') is not launch or launch.__code__ is not code or launch.__defaults__ is not defaults or current is not mapping or tuple(current.items())!=items or launch.__closure__ is not closure:raise ValueError('changed native owner')
    launch(root,'scripts/main-select-program-owner.mjs','55718e8697a51fb0b087c9f2f7d15508917c61001667bd0a3d75b534d6a53ccc',(),spawn=spawn,pipe=pipe,close=close,read=native_read,waitpid=waitpid,kill=kill,poll=poll,clock=clock,node=node,path=path,dup2=dup2,close_action=close_action,nohang=nohang,launcher=launcher)

import hashlib,json,re,weakref,subprocess,shutil,os
from pathlib import Path

from current_sass_spinner_snack_admission import CurrentSpinnerSnackContract
from select_program_transition_source_v2 import select_program_transitions
_ROOT=Path(__file__).resolve().parents[1];_IMAGE=Path(__file__).read_bytes();_CONTEXTS=weakref.WeakKeyDictionary()
_CASE='mixin-css/private-check-duplicate-theme-styles';_CONTRACT='historical-private-card-with-public-peer-overrides';_PROGRAM='f74770ded45c82a9caa9ae8b630ffb39aafa7a6bd1b2050004ba5e46a4776c7d';_ORIGINAL='b4e40842f13244e578d93b26919c69f5668e24a0736a46742c1d79cc747fe9ca'
_PINS={'scripts/current_sass_spinner_snack_admission.py':'1af5a8902551ceddaf6d773d6b0abef10e2733ffa85ec5472bae0f6a9feb6c5b','scripts/current_sass_source.py':'1bf1bd2ff60bf3ee7b1aa44c7e0f443ae0642098cdac8f1d9d81f2aa0587bbbb','scripts/sass-private-card-gate.mjs':'46792f1e6f2b128c206c31d0f1edbfe9ca542c45ff1833bacd9da917cc8f6f5e','scripts/private-card-composition.mjs':'bde7f5ea938282acfcf98e5c8f03f9c9660650ddd815287b76a832dbeeb16d54','scripts/private-card-peer-check.mjs':'7f85cf94963c240325393367786faae1984a822000aa48935b77270c50b11bca','scripts/private_card_composition.py':'7adf1a44d80a49b2a61d197fd449e0218db1c391d7f6d8c9f44ce8e34b6eb810','fixtures/sass/private-card-peer-pins.json':'975904b6287c0be803cff023d58603fcc2a565be4515545718e60e604a6ea69c','fixtures/sass/private-card-peer.scss':'28bcb7a6c8c582ad187d46f9705ba6898aede018555f6088df6481487fad7ca5','compatibility/rc/original16-sass-source-diagnostic-identity.json':'324762d77a76762518b1a1b4328a4abaf2c388597fd03b1ef4323d736441ddbe','compatibility/rc/oracles/material-16.2.14-sass-api.json':'76908825fdbb55fc188f0add372d371f473cd7874cbf575894247231ab854e2d','compatibility/rc/oracles/material-16.2.14-sass-argument-cases.json':'8613cc1432b2ae351e655a59b3e39b2c48d80da12c875b5233f4fac2192d657a','reference/material-16.2.14/PROVENANCE.json':'d13d466669cbf96d386ceabfe3de0241b91bcbd3dce98ac70c31093609100f34','reference/material-16.2.14/environment-package-lock.json':'ad2f9d62bf04758f87650cae408f805e667236f992cd6d8e481c5577c939d130'}
_hash=lambda x:hashlib.sha256(x.encode() if type(x) is str else x).hexdigest()
def _plain(x):
    if x is None or type(x) in (str,bool):return x
    if type(x) is int and abs(x)<=9007199254740991:return x
    if type(x) is list:return [_plain(v) for v in x]
    if type(x) is dict and all(type(k) is str for k in x):return {k:_plain(v) for k,v in x.items()}
    raise ValueError('nonplain metadata')
def _read(root,path):
    if type(path) is not str or not path or path.startswith('/') or '\\' in path or any(x in ('','.','..') for x in path.split('/')):raise ValueError('path')
    p=root
    for bit in path.split('/'):
        p=p/bit
        if p.is_symlink():raise ValueError('linked input')
    if not p.is_file():raise ValueError('not file')
    return p.read_bytes()
_EXPECTED_ENGINE='356337aa30fed58fcc25afeaabca5ebb3695623c0f17a0aff497a3bd92b4a383'
def _expected_plain(value):
    if value is None or type(value) in (str,bool):return value
    if type(value) is int and abs(value)<=9007199254740991:return value
    if type(value) is list:return [_expected_plain(v) for v in value]
    if type(value) is dict and all(type(k) is str for k in value):return {k:_expected_plain(v) for k,v in value.items()}
    raise ValueError('plain expected input required')
def _isolated_expected_computation(root,line,operation,value):
    if not __debug__:raise ValueError('assertions required')
    payload=_expected_plain(value);path=Path(root)/'scripts/sass-expected-snapshot-engine.mjs';raw=path.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=_EXPECTED_ENGINE:raise ValueError('trusted expected bootstrap changed')
    node=shutil.which('node')
    if not node:raise ValueError('pinned Node unavailable')
    result=subprocess.run([node,'--input-type=module','--eval',raw.decode(),str(root),line,operation],input=json.dumps(payload,separators=(',',':'),ensure_ascii=False),text=True,capture_output=True,cwd=root,env={'LANG':'C.UTF-8','LC_ALL':'C.UTF-8','TZ':'UTC'},timeout=150)
    if result.returncode!=0:raise ValueError('expected isolation failed: '+result.stderr[:1000])
    out=_expected_plain(json.loads(result.stdout))
    if out['line']!=line or out['operation']!=operation or out['schema_version']!=1 or type(out['css']) is not str or out['css_sha256']!=hashlib.sha256(out['css'].encode()).hexdigest() or out['css_bytes']!=len(out['css'].encode()) or payload!=_expected_plain(value):raise ValueError('expected output identity')
    if path.read_bytes()!=raw:raise ValueError('bootstrap changed during evaluation')
    return out

def _verify_private_js_owner(root):
    path='compatibility/rc/current-main-private-card-select-owner-v2.json';raw=_read(root,path);assert (_hash(raw),len(raw))==('62ec4d7ab837c520899b47c8809c767cacb79c233b6145e915086918256d6f8a',5107);p=json.loads(raw);name='scripts/sass-private-card-gate.mjs';assert p['schema_version']==1 and p['role']=='main-private-card-select-owner-continuation' and p['line']=='main' and p['source_parent']=='c2c58388e0777e580fd76234b57c271de0cb4115' and p['source_scope_only'] is True and p['artifact_or_audit_admission_granted'] is False and [x['path'] for x in p['updates']]==[name]
    step_path='compatibility/rc/current-sass-stepper-private-gate-executable-v1.json';step_raw=_read(root,step_path);assert _hash(step_raw)=='efedf94e02295045ed681484aef77661c858fa5a8e7612f5931eeb7a3bfcb6eb';step=json.loads(step_raw);assert step['schema_version']==1 and step['role']=='main-stepper-private-gate-executable-successor' and step['line']=='main' and step['source_parent']=='42d02491648097656ccb3c590dbaaea066c3e603' and step['source_scope_only'] is True and step['artifact_or_audit_admission_granted'] is False and [x['path'] for x in step['updates']]==[name]
    prior_raw=_read(root,'compatibility/rc/current-sass-select-private-gate-executable-v2.json');assert _hash(prior_raw)=='f0a8f5b76ce7b6aeca446247488d4621171ab155c3215d61fd826730d2111e80';prior=json.loads(prior_raw);r=p['updates'][0];assert prior['schema_version']==2 and prior['role']=='main-select-private-gate-executable-successor' and prior['line']=='main' and prior['previous_packet']==dict(path=step_path,sha256=_hash(step_raw),bytes=len(step_raw)) and prior['source_scope_only'] is True and prior['artifact_or_audit_admission_granted'] is False and [x['path'] for x in prior['updates']]==[name] and prior['updates'][0]['after']==r['before']
    env=dict(PATH=os.environ.get('PATH',''),LANG='C',LC_ALL='C',GIT_CONFIG_GLOBAL='/dev/null',GIT_CONFIG_SYSTEM='/dev/null',GIT_TERMINAL_PROMPT='0',GIT_NO_REPLACE_OBJECTS='1',GIT_NO_LAZY_FETCH='1');git=lambda commit:subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+name],cwd=root,env=env);subprocess.check_call(['git','--no-replace-objects','merge-base','--is-ancestor',p['source_parent'],'HEAD'],cwd=root,env=env)
    original=git(step['source_parent']);step_row=step['updates'][0];assert (_hash(original),len(original))==(step_row['before']['sha256'],step_row['before']['bytes']);at=0;parts=[]
    for e in step_row['edits']:
        assert set(e)=={'offset','before','after'} and type(e['offset']) is int and at<=e['offset']<=len(original);before=e['before'].encode();assert original[e['offset']:e['offset']+len(before)]==before;parts.extend((original[at:e['offset']],e['after'].encode()));at=e['offset']+len(before)
    middle=b''.join([*parts,original[at:]]);assert dict(path=name,sha256=_hash(middle),bytes=len(middle))==step_row['after'] and prior['updates'][0]['before']==step_row['after'];at=0;parts=[]
    for e in prior['updates'][0]['edits']:
        assert set(e)=={'offset','before','after'} and type(e['offset']) is int and at<=e['offset']<=len(middle);before=e['before'].encode();assert middle[e['offset']:e['offset']+len(before)]==before;parts.extend((middle[at:e['offset']],e['after'].encode()));at=e['offset']+len(before)
    old=b''.join([*parts,middle[at:]]);assert dict(path=name,sha256=_hash(old),bytes=len(old))==r['before'] and git(p['source_parent'])==old;at=0;parts=[]
    for e in r['edits']:
        assert set(e)=={'offset','before','after'} and type(e['offset']) is int and at<=e['offset']<=len(old);before=e['before'].encode();assert old[e['offset']:e['offset']+len(before)]==before;parts.extend((old[at:e['offset']],e['after'].encode()));at=e['offset']+len(before)
    result=b''.join([*parts,old[at:]]);assert r['after']['path']==name and (_hash(result),len(result))==(r['after']['sha256'],r['after']['bytes'])
    successor_path='compatibility/rc/current-main-private-card-js-source-e7-v1.json';successor_raw=_read(root,successor_path);assert (_hash(successor_raw),len(successor_raw))==('d452597a80685d87a556850c8f5e029262d860b98ba654a6d2846fe31e6d6bf8',9715);successor=json.loads(successor_raw)
    assert successor['schema_version']==1 and successor['role']=='main-private-card-js-source-e7-successor' and successor['source_scope_only'] is True and successor['historical_programs_executed'] is False and successor['historical_packets_rewritten'] is False and successor['css_or_artifact_admission_granted'] is False
    assert successor['parent']=='ce9cd3d0b76e240ad0ffc03e2a05ff41f8f363ab' and successor['commit']=='e7b2861ad179572aaf88d81453524c47091323ed' and successor['previous_packet']==dict(path=path,sha256=_hash(raw),bytes=len(raw))
    command=lambda *args:subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',*args],cwd=root,env=env)
    assert command('rev-list','--parents','-n','1',successor['commit']).decode().strip()==successor['commit']+' '+successor['parent'];command('merge-base','--is-ancestor',successor['commit'],'HEAD')
    supports=['scripts/select-program-transition-source-v2.mjs','scripts/select_program_transition_source_v2.py','compatibility/rc/current-main-density-source-ae9-successor-v1.json'];assert [x['path'] for x in successor['support']]==supports
    for item in successor['support']:
        data=command('show',successor['commit']+':'+item['path']);assert dict(path=item['path'],sha256=_hash(data),bytes=len(data))==item and _read(root,item['path'])==data
    update=successor['update'];assert update['path']==name and update['before']==r['after'] and git(successor['parent'])==result;at=0;parts=[]
    for e in update['edits']:
        assert set(e)=={'offset','before','after'} and type(e['offset']) is int and at<=e['offset']<=len(result);before=e['before'].encode();assert result[e['offset']:e['offset']+len(before)]==before;parts.extend((result[at:e['offset']],e['after'].encode()));at=e['offset']+len(before)
    current=b''.join(parts+[result[at:]]);assert update['after']['path']==name and (_hash(current),len(current))==(update['after']['sha256'],update['after']['bytes']) and git(successor['commit'])==current and _read(root,name)==current
    assert _read(root,successor_path)==successor_raw
    return update['after']['sha256']
class PrivateCardGateContext:
    __slots__=('__weakref__',)
    def __init__(self,root):
        select_checked=_guarded(_run_select_owner,'_run_select_owner')
        transition_checked=_guarded(select_program_transitions,'select_program_transitions')
        if not __debug__:raise RuntimeError('optimized mode cannot authenticate source')
        root=Path(root).absolute();source=CurrentSpinnerSnackContract(root);line=source.line;sets=list(source.source_sets.values())
        if len(sets)!=1:raise ValueError('source closure')
        historical=json.loads(_read(root,'compatibility/rc/original16-sass-source-diagnostic-identity.json'));orig=list(historical['loaded_source_sets'].values())
        if len(orig)!=1 or len(orig[0])!=286:raise ValueError('original closure')
        oracle=json.loads(_read(root,'compatibility/rc/oracles/material-16.2.14-sass-api.json'));cases=json.loads(_read(root,'compatibility/rc/oracles/material-16.2.14-sass-argument-cases.json'));call=cases['mixins']['private-check-duplicate-theme-styles']['call'];program="@use '__entry__' as m;\n"+oracle['standard_theme']+'\n'+call+'\n'
        if _hash(program)!=_PROGRAM or oracle['members']['mixins']['private-check-duplicate-theme-styles']['invocation']['css_sha256']!=_ORIGINAL:raise ValueError('plan')
        prov=json.loads(_read(root,'reference/material-16.2.14/PROVENANCE.json'))['isolated_environment'];lock=json.loads(_read(root,'reference/material-16.2.14/environment-package-lock.json'));pins=json.loads(_read(root,'fixtures/sass/private-card-peer-pins.json'));branch=pins['branches']['21' if line=='21.x' else 'main'];info=branch['sass_info'];identity=dict(material_version='16.2.14',material_manifest_sha256=prov['material_manifest_sha256'],lock_sha256=prov['package_lock_sha256'],material_integrity=lock['packages']['node_modules/@angular/material']['integrity'],catalog='compatibility/rc/oracles/material-16.2.14-sass-api.json',catalog_sha256=_PINS['compatibility/rc/oracles/material-16.2.14-sass-api.json'],sass_version=info,expected_source='untouched-installed-material16',candidate_source='packed-facade')
        if line=='main':
            assert _hash(_read(root,'scripts/main_select_program_proof.py'))=='b107f2f2f59d783721409eb673cab3fb7e534353ba68fbb1aca5afebbc3a45a2';select_checked(root,lambda p:_read(root,p))
        successor,successor_current=transition_checked(root,line,private=False)
        if line=='main':successor['scripts/sass-private-card-gate.mjs']=_verify_private_js_owner(root)
        _CONTEXTS[self]=dict(select_checked=select_checked,successor=successor,successor_current=successor_current,root=root,source=source,line=line,sources=_plain(sets[0]),original_sources=_plain(orig[0]),descriptor=_plain(dict(contract=_CONTRACT,source=source.descriptor)),identity=identity,call=call,info=info)
        self.assert_current()
    def assert_current(self):
        if not __debug__:raise RuntimeError('optimized mode cannot authenticate source')
        s=_CONTEXTS[self];s['source'].assert_current();_verify_private_js_owner(s['root']) if s['line']=='main' else None;(_hash(_read(s['root'],'scripts/main_select_program_proof.py'))=='b107f2f2f59d783721409eb673cab3fb7e534353ba68fbb1aca5afebbc3a45a2' or (_ for _ in ()).throw(ValueError('select proof helper changed'))) if s['line']=='main' else None;s['select_checked'](s['root'],lambda p:_read(s['root'],p)) if s['line']=='main' else None;s['successor_current']()
        if Path(__file__).read_bytes()!=_IMAGE or _read(s['root'],'scripts/sass_private_card_gate.py')!=_IMAGE:raise ValueError('gate changed')
        for path,digest in _PINS.items():
            if _hash(_read(s['root'],path))!=s['successor'].get(path,digest):raise ValueError('proof input changed')
        s['source'].assert_current()
def private_card_gate_match(context,body):
    if not __debug__ or type(context) is not PrivateCardGateContext or context not in _CONTEXTS:return False
    try:
        s=_CONTEXTS[context];b=_plain(body);e=b['expected'];a=b['actual'];d=b['current_private_card']
        if (set(e)!={'css','css_bytes','css_sha256','program_sha256','sources'} or set(a)!={'css','css_bytes','css_sha256','line','program_sha256','sass_version','sources'} or b['case_id']!=_CASE or b['line']!=s['line'] or b['identity']!=s['identity'] or d!=s['descriptor'] or e['program_sha256']!=_PROGRAM or e['css_sha256']!=_ORIGINAL or _hash(e['css'])!=_ORIGINAL or e['css_bytes']!=989 or e['sources']!=s['original_sources'] or a['line']!=s['line'] or a['sass_version']!=s['info'] or a['program_sha256']!=_PROGRAM or a['css_sha256']!=_hash(a['css']) or type(a['css_bytes']) is not int or a['css_bytes']!=len(a['css'].encode()) or a['sources']!=s['sources']):return False
        if _isolated_expected_computation(s['root'],s['line'],'private-card',dict(originalCss=e['css']))['css']!=a['css']:return False
        context.assert_current();return _plain(body)==b
    except (KeyError,TypeError,ValueError,AttributeError,AssertionError,OSError,RecursionError):return False
def private_card_assertion_ok(root,active,body,invocation):
    if not __debug__:return False
    try:
        context=PrivateCardGateContext(root);s=_CONTEXTS[context];b=_plain(body);a=_plain(dict(manifest=active.manifest,binding=active.binding));line=s['line'];binding=a['binding'];manifest=a['manifest']
        fields=dict(kind='assertion',check_id='sass-seal',group='sass-api-and-values',result='pass',exit_code=0,line=line,run_id=manifest['run_id'],invocation_id=invocation,binding=binding,error=None,mutation_rejected=True,comparison=_CONTRACT)
        if any(type(b.get(k)) is not type(v) or b.get(k)!=v for k,v in fields.items()):return False
        if any(k in b for k in ('current_companion','current_infrastructure','current_spinner_snack_bridge','current_ordinary_card','current_ordinary_controls','current_ordinary_density','current_peer_alias')):return False
        if binding['source_line']!=line or manifest['source']['line']!=line or binding['run_id']!=manifest['run_id'] or type(invocation) is not str or not invocation:return False
        for key,name in [('source_commit','commit'),('source_tree','git_tree_sha'),('source_content_sha256','content_sha256')]:
            if binding[key]!=manifest['source'][name] or not re.fullmatch('[0-9a-f]{64}' if key=='source_content_sha256' else '[0-9a-f]{40}',binding[key]):return False
        if binding['artifacts_sha256']!=_hash(json.dumps(manifest['artifacts'],sort_keys=True,separators=(',',':'),allow_nan=False)):return False
        libs=[x for x in manifest['artifacts'] if x['id']=='library']
        if len(libs)!=1 or not re.fullmatch('[0-9a-f]{64}',libs[0]['sha256']) or b['tarball_sha256']!=libs[0]['sha256']:return False
        if b['oracle']!='compatibility/rc/oracles/material-16.2.14-sass-api.json' or b['oracle_sha256']!=_PINS[b['oracle']] or b['mixin']!='private-check-duplicate-theme-styles' or b['variant']!='historical-duplicate-theme' or b['call']!=s['call']:return False
        if b['expected_sha256']!=b['expected']['css_sha256'] or b['expected_bytes']!=b['expected']['css_bytes'] or b['actual_sha256']!=b['actual']['css_sha256'] or b['actual_bytes']!=b['actual']['css_bytes'] or b['actual_measurement']!=b['actual']:return False
        wrong=b['actual']['css']+'\n.wrong-nonempty-mixin { color: red; }\n'
        if b['mutation']!=dict(css=wrong,css_sha256=_hash(wrong),css_bytes=len(wrong.encode())):return False
        return private_card_gate_match(context,b) and _plain(body)==b
    except (KeyError,TypeError,ValueError,AttributeError,AssertionError,OSError,RecursionError):return False
