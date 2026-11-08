# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Independent complete owner-continuation replay with current physical guards."""
import hashlib
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from current_sass_tool_references import CurrentSassToolReferences

physical=lambda path:(ROOT/path).read_bytes()
v2=json.loads(physical('compatibility/rc/main-current-inventory-source-routing-v2.json'))['updates'][0]
v3=json.loads(physical('compatibility/rc/main-current-inventory-source-routing-v3.json'))['updates'][0]
packet=json.loads(physical('compatibility/rc/main-current-inventory-source-routing-v4.json'));update=packet['updates'][0]
scope=CurrentSassToolReferences(ROOT)
for ref in [v2['before'],v2['after'],v3['after'],update['after']]:
    assert scope.qualify(ref)==update['after']
    assert hashlib.sha256(scope.comparison_bytes(ref)).hexdigest()==ref['sha256']
assert scope.qualify(dict(update['before'],sha256='0'*64)) is None
try:scope.qualify(dict(update['before'],bytes=update['before']['bytes']+1))
except AssertionError:pass
else:raise AssertionError('wrong owner length qualified')
targets=['compatibility/rc/main-current-inventory-source-routing-v4.json',update['path'],
 'scripts/current-inventory-source-subject.mjs','scripts/retained-later-stage-program-source.mjs',
 'compatibility/rc/main-retained-later-stage-programs-v1.json','scripts/retained-selection-metadata-context.mjs',
 'compatibility/rc/main-retained-selection-metadata-context-v1.json','scripts/retained-landscape-program-source.mjs',
 'compatibility/rc/main-retained-landscape-program-source-v1.json','compatibility/rc/main-retained-landscape-current-prototype-v1.json.gz',
 'scripts/autocomplete-selection-native-subject.mjs','scripts/upstream-candidate-source-evidence.mjs',
 'compatibility/rc/autocomplete-selection-ledger-successor.json']
assert len(set(targets))==13 and set(targets)<={ref['path'] for ref in scope.bound}
bad=False;target=None
def read(path):
    raw=physical(path)
    return raw+b' ' if bad and path==target else raw
live=CurrentSassToolReferences(ROOT,read=read)
for target in targets:
    bad=True
    for action in [live.assert_current,lambda:CurrentSassToolReferences(ROOT,read=read)]:
        try:action()
        except (AssertionError,ValueError):pass
        else:raise AssertionError('changed retained owner input accepted: '+target)
    bad=False;live.assert_current()
result=dict(result='pass',bound=scope.bound,transitions=scope.transitions,targets=targets,cold_rejections=13,late_rejections=13,
            recoveries=13,owner_images_preserved=4,unknown_hash_not_qualified=True,wrong_length_rejected=True,
            historical_programs_executed=False,artifact_or_audit_admission_granted=False)
if len(sys.argv)>1:
    with Path(sys.argv[1]).open('x') as output:json.dump(result,output,indent=2);output.write('\n')
print(json.dumps(dict(result='pass',bound=len(scope.bound),transitions=len(scope.transitions),cold_rejections=13,late_rejections=13,recoveries=13,owner_images_preserved=4)))
