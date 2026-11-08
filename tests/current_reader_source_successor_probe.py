# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
import sys,json
from pathlib import Path
root=Path.cwd();sys.path.insert(0,str(root/'scripts'))
from current_sass_tool_references import CurrentSassToolReferences
targets=['scripts/historical-repair-live-source-successor.mjs','scripts/autocomplete-selection-spec-subject.mjs','scripts/current-authored-tab-source-successor.mjs','scripts/autocomplete-current-spec-source-successor.mjs','compatibility/rc/main-retained-current-reader-source-successors-v1.json','compatibility/rc/main-autocomplete-current-spec-source-successor-v1.json','scripts/current-inventory-source-subject.mjs','compatibility/rc/main-current-inventory-source-routing-v2.json','scripts/packed-upstream-ledger-epoch.mjs','scripts/inventory-reference-owner.mjs','scripts/inventory-finite-tool-successor.mjs']
targets+=['compatibility/rc/main-current-inventory-source-routing-v3.json','scripts/retained-validator-program-source.mjs','compatibility/rc/main-retained-validator-programs-v1.json']
bad=False;target=None
def read(path):
    raw=(root/path).read_bytes()
    return raw+b' ' if bad and path==target else raw
live=CurrentSassToolReferences(root,read=read)
for target in targets:
    bad=True
    for name,operation in [('late',live.assert_current),('cold',lambda:CurrentSassToolReferences(root,read=read))]:
        try:operation()
        except AssertionError:pass
        else:raise AssertionError(name+' accepted '+target)
    bad=False;live.assert_current()
for target in targets[:2]:assert live.qualify(dict(path=target,sha256='0'*64)) is None
report=dict(result='pass',targets=targets,cold_rejections=len(targets),late_rejections=len(targets),recovery=len(targets),unknown_references_rejected=2,epoch=live.epoch,bound=live.bound,transitions=live.transitions)
if len(sys.argv)>1:
    with open(sys.argv[1],'x') as stream:json.dump(report,stream,indent=2);stream.write('\n')
print(json.dumps(dict(report,bound=len(report['bound']),transitions=len(report['transitions']))))
