# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact select-program source proof; no CSS or artifact admission."""
import hashlib,json,os,subprocess
_hash=lambda b:hashlib.sha256(b.encode() if type(b) is str else b).hexdigest()
def verify_select_program_source(root,read):
    path='compatibility/rc/current-main-select-density-program-v1.json';raw=read(path);assert (_hash(raw),len(raw))==('1c1417392d8086499e1f7b480c0f9c5e25721ffbed13e769be9dc6a56cbe6e7a',5000);p=json.loads(raw);names=['scripts/select-program-transition-source.mjs','scripts/select_program_transition_source.py'];assert p['schema_version']==1 and p['role']=='main-select-program-density-resource-continuation' and p['line']=='main' and p['source_parent']=='c2c58388e0777e580fd76234b57c271de0cb4115' and p['source_scope_only'] is True and p['artifact_or_audit_admission_granted'] is False and [r['path'] for r in p['updates']]==names
    env=dict(PATH=os.environ.get('PATH',''),LANG='C',LC_ALL='C',GIT_CONFIG_GLOBAL='/dev/null',GIT_CONFIG_SYSTEM='/dev/null',GIT_TERMINAL_PROMPT='0',GIT_NO_REPLACE_OBJECTS='1',GIT_NO_LAZY_FETCH='1');subprocess.check_call(['git','--no-replace-objects','merge-base','--is-ancestor',p['source_parent'],'HEAD'],cwd=root,env=env)
    for r in p['updates']:
        before=subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',p['source_parent']+':'+r['path']],cwd=root,env=env);assert r['before']['path']==r['path'] and (_hash(before),len(before))==(r['before']['sha256'],r['before']['bytes']);at=0;parts=[]
        for e in r['edits']:
            assert set(e)=={'offset','before','after'} and type(e['offset']) is int and at<=e['offset']<=len(before);old=e['before'].encode();assert before[e['offset']:e['offset']+len(old)]==old;parts.extend((before[at:e['offset']],e['after'].encode()));at=e['offset']+len(old)
        after=b''.join([*parts,before[at:]]);assert r['after']['path']==r['path'] and (_hash(after),len(after))==(r['after']['sha256'],r['after']['bytes']) and read(r['path'])==after
