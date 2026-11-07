# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact two-epoch source programs; historical bytes are comparison data only."""
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
def select_program_transitions(root,line,read,*,private=False):
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
        actual=physical(path);value=read(path);assert type(value) is bytes and actual==value and physical(path)==actual
        if path in bound:assert actual==bound[path]
        else:bound[path]=actual
        return actual
    assert take(SELF)==_IMAGE;assert digest(take('scripts/stepper_program_transition_source.py'))=='262368915c858aabb031cc4eced639cc34c099bbe5516c60bae1761096b9aa42';refs={}
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
            after=replay(middle,update['edits']);assert ref(row['path'],after)==update['after'] and take(row['path'])==after;refs[row['path']]=update['after']['sha256']
    def assert_current():
        for path,raw in bound.items():assert take(path)==raw
        for path,raw in bound.items():assert physical(path)==raw
    assert_current();return refs,assert_current
