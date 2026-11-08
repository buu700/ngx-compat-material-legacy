# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Independent exact two-program replay, with full physical late guards."""
import hashlib
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from current_sass_tool_references import CurrentSassToolReferences

physical=lambda path:(ROOT/path).read_bytes()
packet_path='compatibility/rc/main-retained-landscape-program-source-v1.json'
packet=json.loads(physical(packet_path))
scope=CurrentSassToolReferences(ROOT)
clean=lambda ref:{key:ref[key] for key in ('path','sha256','bytes')}
for update in packet['updates']:
    before,after=clean(update['before']),clean(update['after'])
    assert scope.qualify(before)==after and scope.predecessor_reference(after)==before
    assert hashlib.sha256(scope.comparison_bytes(before)).hexdigest()==before['sha256']
    assert hashlib.sha256(scope.comparison_bytes(after)).hexdigest()==after['sha256']
    assert scope.qualify(dict(before,sha256='0'*64)) is None
    try:scope.qualify(dict(before,bytes=before['bytes']+1))
    except AssertionError:pass
    else:raise AssertionError('wrong program length qualified')
targets=['scripts/retained-landscape-program-source.mjs',packet_path,
         *[row['path'] for row in packet['updates']],*[ref['path'] for ref in packet['support']]]
assert len(set(targets))==13
bad=False;target=None
def read(path):
    raw=physical(path)
    return raw+b' ' if bad and path==target else raw
live=CurrentSassToolReferences(ROOT,read=read)
for target in targets:
    bad=True
    for action in (live.assert_current,lambda:CurrentSassToolReferences(ROOT,read=read)):
        try:action()
        except (AssertionError,ValueError):pass
        else:raise AssertionError('changed program input accepted: '+target)
    bad=False;live.assert_current()
result=dict(result='pass',bound=scope.bound,transitions=scope.transitions,targets=targets,
            cold_rejections=13,late_rejections=13,recoveries=13,unknown_hash_not_qualified=True,
            wrong_length_rejected=True,historical_programs_executed=False,artifact_or_audit_admission_granted=False)
if len(sys.argv)>1:
    with Path(sys.argv[1]).open('x') as output:json.dump(result,output,indent=2);output.write('\n')
print(json.dumps(dict(result='pass',bound=len(scope.bound),transitions=len(scope.transitions),cold_rejections=13,late_rejections=13,recoveries=13)))
