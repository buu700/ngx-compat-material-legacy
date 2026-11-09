# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact two-epoch source programs; historical bytes are comparison data only."""
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

import binascii as _owner_binascii
_owner_b2a=_owner_binascii.b2a_base64
if type(_owner_b2a) is not _owner_types.BuiltinFunctionType:raise RuntimeError('native base64 required')
def _run_density_resource_owner(root,path,initial,initial_ref,read,*,native=_OWNER_NATIVE,b2a=_owner_b2a,rows=(
 ('scripts/current-sass-source.mjs','357a76daa5221d9dc9da095e23f11be4d7a627ed102a2078eb079f25ec7fccf8',23987,'f173497d4a16acb5c7e248363f214343f7c76f456212839b0da815064d09b4d9'),
 ('scripts/current-sass-spinner-snack-contract.mjs','21b211398260e1801cf02a72b139f5c9371482872763ca6168915377a5ea39c4',20042,'98d54a01132d1c8e4c14331b1902efa1f019988e9264c256e0622c97b5e33020'),
 ('scripts/current_sass_source.py','dc9e9a681d4bc67df377111ce8d119d82d8101c3c3657b037282fc68098adc8a',21241,'fca2a1ebdc8828e38b98ef73f16e36be3c60e8af95ee44644ef96333326e3a9e'),
 ('scripts/current_sass_spinner_snack_admission.py','ea27e7956065d5be34a5306f55a8a4a891af70ecb21a145f4b20cc818493f15b',18382,'77754a29a76781c956dab7e7af88382ab83290c66c0c9f00d7b1b73a89f9d938'))):
    matches=[row for row in rows if row[0]==path]
    if len(matches)!=1:raise ValueError('density path')
    row=matches[0]
    if initial_ref!={'path':path,'sha256':row[1],'bytes':row[2]}:raise ValueError('density predecessor')
    for name in ['compatibility/rc/current-main-density-input-successor-v2.json','compatibility/rc/current-main-density-input-successor-v3.json','compatibility/rc/main-tooltip-resource-source-programs-v1.json','compatibility/rc/main-sass-graph-resource-source-programs-v2.json','compatibility/rc/main-sass-resource-contract-programs-v1.json']:read(name)
    current=read(path)
    launch,code,defaults,mapping,items,closure,spawn,pipe,close,native_read,waitpid,kill,poll,clock,node,node_path,dup2,close_action,nohang,launcher=native;current_defaults=launch.__kwdefaults__
    if globals().get('_native_owner') is not launch or launch.__code__ is not code or launch.__defaults__ is not defaults or current_defaults is not mapping or tuple(current_defaults.items())!=items or launch.__closure__ is not closure:raise ValueError('changed native owner')
    launch(root,'scripts/main-density-native-owner.mjs','5c9e38edd4a4373a9d962a8c81f04d22dce88896ace254a880ae6c523d87eb52',(path,b2a(initial,newline=False).decode('ascii')),spawn=spawn,pipe=pipe,close=close,read=native_read,waitpid=waitpid,kill=kill,poll=poll,clock=clock,node=node,path=node_path,dup2=dup2,close_action=close_action,nohang=nohang,launcher=launcher)
    return current,{'path':path,'sha256':row[3],'bytes':len(current)}

import hashlib,json,os,stat,subprocess
from pathlib import Path

SELF='scripts/select_program_transition_source.py';_IMAGE=Path(__file__).read_bytes()
def digest(raw):return hashlib.sha256(raw).hexdigest()
def ref(path,raw):return dict(path=path,sha256=digest(raw),bytes=len(raw))
PACKETS=(
 ('compatibility/rc/current-sass-stepper-source-executables-v1.json','577ca8a935a6f431ed282769be29d84686c109a94faef9174de0091754e59d61','main-stepper-current-source-executable-successor','compatibility/rc/current-sass-select-source-executables-v2.json','ca173498329ead35221ef603bcb751699dd18e041cc002eca97c644f87e980a0','main-select-current-source-executable-successor',['scripts/current-sass-source.mjs','scripts/current_sass_source.py']),
 ('compatibility/rc/current-sass-stepper-spinner-executables-v1.json','2b2440b6f1b870e456d8585129e99270dffd90fc03842ab0944d555908b7b760','main-stepper-spinner-source-executable-successor','compatibility/rc/current-sass-select-spinner-executables-v2.json','76216b309c092dcf68f90c29f37450fe656638524add4cd305894ef3a08860a3','main-select-spinner-source-executable-successor',['scripts/current-sass-spinner-snack-contract.mjs','scripts/current_sass_spinner_snack_admission.py']),
)
PRIVATE=('compatibility/rc/current-sass-stepper-private-gate-executable-v1.json','efedf94e02295045ed681484aef77661c858fa5a8e7612f5931eeb7a3bfcb6eb','main-stepper-private-gate-executable-successor','compatibility/rc/current-sass-select-private-gate-executable-v2.json','f0a8f5b76ce7b6aeca446247488d4621171ab155c3215d61fd826730d2111e80','main-select-private-gate-executable-successor',['scripts/sass-private-card-gate.mjs'])
def replay(before,edits):
    cursor=0;parts=[]
    for edit in edits:
        assert set(edit)=={'offset','before','after'} and type(edit['offset']) is int and edit['offset']>=cursor
        old=edit['before'].encode();value=edit['after'].encode();assert before[edit['offset']:edit['offset']+len(old)]==old
        parts.extend((before[cursor:edit['offset']],value));cursor=edit['offset']+len(old)
    return b''.join([*parts,before[cursor:]])
def _make_select_program_transitions(density_checked):
    def select_program_transitions(root,line,*,private=False):
        density_function=density_checked;density_code=density_function.__code__;density_defaults=density_function.__defaults__;density_mapping=density_function.__kwdefaults__;density_items=tuple(density_mapping.items()) if density_mapping else ()
        if not __debug__:raise RuntimeError('assertions required for select source transitions')
        if line!='main':return {},lambda:None
        bound={}
        def physical(path):
            assert type(path) is str and path and not path.startswith('/') and '\\' not in path and all(part and part not in ('.','..') for part in path.split('/'))
            at=Path(root)
            for part in path.split('/'):
                at=at/part;assert not stat.S_ISLNK(os.lstat(at).st_mode)
            assert stat.S_ISREG(os.lstat(at).st_mode);return at.read_bytes()
        def take(path):
            actual=physical(path);assert physical(path)==actual
            if path in bound:assert actual==bound[path]
            else:bound[path]=actual
            return actual
        assert take(SELF)==_IMAGE;assert digest(take('scripts/main_sass_resource_continuation.py'))=='31c9db56ebaab0fa3500cca4e80c289341bee0868f03fa4c6dbbbabd3db6ae20';assert digest(take('scripts/stepper_program_transition_source.py'))=='262368915c858aabb031cc4eced639cc34c099bbe5516c60bae1761096b9aa42';refs={}
        env=dict(PATH=os.environ.get('PATH',''),LANG='C',LC_ALL='C',GIT_CONFIG_GLOBAL='/dev/null',GIT_CONFIG_SYSTEM='/dev/null',GIT_TERMINAL_PROMPT='0',GIT_NO_REPLACE_OBJECTS='1',GIT_NO_LAZY_FETCH='1')
        for path,pin,role,next_path,next_pin,next_role,members in (*PACKETS,*((PRIVATE,) if private else ())):
            raw=take(path);assert digest(raw)==pin;p=json.loads(raw)
            assert p['schema_version']==1 and p['role']==role and p['line']=='main' and p['source_parent']=='42d02491648097656ccb3c590dbaaea066c3e603'
            assert p['source_scope_only'] is True and p['artifact_or_audit_admission_granted'] is False and [r['path'] for r in p['updates']]==members
            next_raw=take(next_path);assert digest(next_raw)==next_pin;next_packet=json.loads(next_raw)
            assert next_packet['schema_version']==2 and next_packet['role']==next_role and next_packet['line']=='main' and next_packet['previous_packet']==ref(path,raw)
            assert next_packet['source_scope_only'] is True and next_packet['artifact_or_audit_admission_granted'] is False and [r['path'] for r in next_packet['updates']]==members
            for item in next_packet.get('authored_support',[]):assert ref(item['path'],take(item['path']))==item
            for row in p['updates']:
                old=subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',p['source_parent']+':'+row['path']],cwd=root,env=env);assert ref(row['path'],old)==row['before']
                middle=replay(old,row['edits']);assert ref(row['path'],middle)==row['after'];update=next(r for r in next_packet['updates'] if r['path']==row['path']);assert update['before']==row['after']
                after=replay(middle,update['edits']);assert ref(row['path'],after)==update['after']
                if row['path'] in ('scripts/current-sass-source.mjs','scripts/current_sass_source.py','scripts/current-sass-spinner-snack-contract.mjs','scripts/current_sass_spinner_snack_admission.py'):
                    def git(commit,path):return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],cwd=root,env=env)
                    for commit in ('19ee6343365c391deb97362caec413b113665e1b','8fe95564c981a9dd73605d27beaa0496824e8444','ecc1051cfb829f0b67ba9cb50e4b733d6684ebff','b94f169d4fe57d571e6a7c3f911a9395f6a60c4d'):subprocess.check_call(['git','--no-replace-objects','merge-base','--is-ancestor',commit,'HEAD'],cwd=root,env=env)
                    density_current=density_function.__kwdefaults__
                    if globals().get('_run_density_resource_owner') is not density_function or density_function.__code__ is not density_code or density_function.__defaults__ is not density_defaults or density_current is not density_mapping or (density_current is not None and tuple(density_current.items())!=density_items):raise ValueError('changed density owner')
                    after,final_ref=density_function(root,row['path'],after,update['after'],take)
                else:final_ref=update['after']
                assert take(row['path'])==after,row['path'];refs[row['path']]=final_ref['sha256']
        def assert_current():
            for path,raw in bound.items():assert take(path)==raw
            for path,raw in bound.items():assert physical(path)==raw
        assert_current();return refs,assert_current

    return select_program_transitions
select_program_transitions=_make_select_program_transitions(_run_density_resource_owner)
