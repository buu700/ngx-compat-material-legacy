# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact source-only executable transitions; historical code is comparison data."""
import hashlib,json,os,subprocess,stat
from pathlib import Path
SELF='scripts/stepper_program_transition_source.py'
_IMAGE=Path(__file__).read_bytes()
def digest(raw):return hashlib.sha256(raw).hexdigest()
PACKETS=(('compatibility/rc/current-sass-stepper-source-executables-v1.json','577ca8a935a6f431ed282769be29d84686c109a94faef9174de0091754e59d61','main-stepper-current-source-executable-successor',['scripts/current-sass-source.mjs','scripts/current_sass_source.py']),('compatibility/rc/current-sass-stepper-spinner-executables-v1.json','2b2440b6f1b870e456d8585129e99270dffd90fc03842ab0944d555908b7b760','main-stepper-spinner-source-executable-successor',['scripts/current-sass-spinner-snack-contract.mjs','scripts/current_sass_spinner_snack_admission.py']))
PRIVATE=('compatibility/rc/current-sass-stepper-private-gate-executable-v1.json','efedf94e02295045ed681484aef77661c858fa5a8e7612f5931eeb7a3bfcb6eb','main-stepper-private-gate-executable-successor',['scripts/sass-private-card-gate.mjs'])
def stepper_program_transitions(root,line,read,*,private=False):
    if not __debug__:raise RuntimeError('assertions required for Stepper source transitions')
    if line!='main':return {},lambda:None
    bound={}
    def physical(path):
        assert type(path) is str and path and not path.startswith('/') and '\\' not in path and all(part and part not in ('.','..') for part in path.split('/'))
        at=Path(root)
        for part in path.split('/'):
            at=at/part;assert not stat.S_ISLNK(os.lstat(at).st_mode)
        assert stat.S_ISREG(os.lstat(at).st_mode)
        return at.read_bytes()
    def take(path):
        actual=physical(path);raw=read(path);assert type(raw) is bytes and raw==actual and physical(path)==actual,'nonphysical Stepper program input '+path
        if path in bound:assert actual==bound[path]
        else:bound[path]=actual
        return actual
    assert take(SELF)==_IMAGE,'changed loaded Stepper program authority';refs={}
    env=dict(PATH=os.environ.get('PATH',''),LANG='C',LC_ALL='C',GIT_CONFIG_GLOBAL='/dev/null',GIT_CONFIG_SYSTEM='/dev/null',GIT_TERMINAL_PROMPT='0',GIT_NO_REPLACE_OBJECTS='1',GIT_NO_LAZY_FETCH='1')
    for path,pin,role,members in (*PACKETS,*((PRIVATE,) if private else ())):
        raw=take(path);assert digest(raw)==pin;p=json.loads(raw)
        assert p['schema_version']==1 and p['role']==role and p['line']=='main' and p['source_parent']=='42d02491648097656ccb3c590dbaaea066c3e603'
        assert p['source_scope_only'] is True and p['artifact_or_audit_admission_granted'] is False and [r['path'] for r in p['updates']]==members
        for row in p['updates']:
            old=subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',p['source_parent']+':'+row['path']],cwd=root,env=env)
            assert dict(path=row['path'],sha256=digest(old),bytes=len(old))==row['before'];at=0;parts=[]
            for edit in row['edits']:
                assert set(edit)=={'offset','before','after'} and type(edit['offset']) is int and edit['offset']>=at
                before=edit['before'].encode();after=edit['after'].encode();assert old[edit['offset']:edit['offset']+len(before)]==before
                parts.extend((old[at:edit['offset']],after));at=edit['offset']+len(before)
            after=b''.join([*parts,old[at:]])
            assert dict(path=row['path'],sha256=digest(after),bytes=len(after))==row['after'] and take(row['path'])==after
            refs[row['path']]=row['after']['sha256']
    def assert_current():
        for path,raw in bound.items():assert take(path)==raw,'changed Stepper program input '+path
        for path,raw in bound.items():assert physical(path)==raw,'late Stepper program input '+path
    assert_current();return refs,assert_current
