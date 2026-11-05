# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
"""Finite final C04 guard afterimage; original support comparison stays a36 Git source."""
from pathlib import Path
import difflib,hashlib,json,os,subprocess
R=Path.cwd();M=Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy');P='compatibility/rc/parallel-spinner-snack-public-bridge-gate-successor-';MF='compatibility/rc/historical-contract-repair-reader-inputs.json';JS='scripts/historical-contract-repair-readers.mjs';PY='tests/historical_contract_repair_source.py';sha=lambda b:hashlib.sha256(b).hexdigest()
def ref(root,path):
 raw=(root/path).read_bytes();return {'path':path,'sha256':sha(raw),'bytes':len(raw)}
def original(root,parent,path):
 env={**os.environ,'GIT_NO_LAZY_FETCH':'1','GIT_NO_REPLACE_OBJECTS':'1'}
 for key in ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']:env.pop(key,None)
 return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],cwd=root,env=env)
def edits(before,after):
 a=before.decode().splitlines(keepends=True);b=after.decode().splitlines(keepends=True);text=before.decode();out=[]
 for group in reversed(list(difflib.SequenceMatcher(None,a,b,autojunk=False).get_grouped_opcodes(6))):
  left=''.join(a[group[0][1]:group[-1][2]]);right=''.join(b[group[0][3]:group[-1][4]]);assert text.count(left)==1;text=text.replace(left,right);out.append({'before':left,'after':right})
 assert text.encode()==after;return out
cutpath='compatibility/rc/parallel-spinner-snack-gate-integration-physical-closure-support-cut-v4.json';raw=(R/cutpath).read_bytes();assert sha(raw)=='18a1b0c9b97bf5d51d232fabba11c02cf05f29f2cf3c5d1aba983364f4a887e2';cut=json.loads(raw);pending={};rows={}
oldpins={'21.x':'5e294e9493e4a6b363e9d73ed8a5078181a8e7f288155507bc40040e5c66758d','main':'791c0fd31a3ca13ab92b7895495a0bff291cdd8e4da2ad515870766f46cfd97e'};pins={}
for line,root in [('21.x',R),('main',M)]:
 for row in cut['transitions']:assert ref(root,row['path'])=={'path':row['path'],**row['after']}
 for row in cut['frozen_inputs_unchanged']:assert ref(root,row['path'])==row
 before=(root/MF).read_bytes();assert sha(before)==oldpins[line];data=json.loads(before);proof=data['gate_tool_successor']['rolled_forward_c04_support'];assert proof['before']['sha256']=='a36fb7a3d2041460378352730f44916a29790cb30d7a5c0880dc39a74f1a90b2';assert proof['after']['sha256']=='27ef368c4da6c859e5e24fc8e43224198de14d4ce49fcbe361c3b545418708d3'
 original_body=original(root,proof['source_parent'],proof['path']);assert sha(original_body)==proof['before']['sha256'];after=(root/proof['path']).read_bytes();proof['after']=ref(root,proof['path']);proof['literal_edits']=edits(original_body,after);data['support_inputs'][0]=dict(proof['after'])
 out=(json.dumps(data,indent=2)+'\n').encode();pending[(line,MF)]=out;pins[line]=sha(out);rows[line]={'old_registry':{'sha256':sha(before),'bytes':len(before)},'new_registry':{'sha256':sha(out),'bytes':len(out)},'only_registry_fields_changed':['support_inputs[0]','gate_tool_successor.rolled_forward_c04_support.after','gate_tool_successor.rolled_forward_c04_support.literal_edits']}
js=(R/JS).read_bytes();py=(R/PY).read_bytes();assert sha(js)=='03eaec9f470f863e34a21db002d44729a8d7706993e3fcdee9c0905f655d075f';assert sha(py)=='a13b398af814b006314c674080b7008e80aeda3dff7addca222061ee5e32bd6b';assert (M/JS).read_bytes()==js and (M/PY).read_bytes()==py
for line in oldpins:
 assert js.count(oldpins[line].encode())==1 and py.count(oldpins[line].encode())==1;js=js.replace(oldpins[line].encode(),pins[line].encode());py=py.replace(oldpins[line].encode(),pins[line].encode())
for line in oldpins:pending[(line,JS)]=js;pending[(line,PY)]=py
for (line,path),body in pending.items():(R if line=='21.x'else M).joinpath(path).write_bytes(body)
out={'schema_version':1,'role':'Final exact known-tool malformed-hash rejection support0 refinement; active source guards unchanged except exact registry pins','support_cut':{'path':cutpath,'sha256':sha(raw),'bytes':len(raw)},'branches':rows,'source_refs':{line:[ref(root,p)for p in [MF,JS,PY]]for line,root in [('21.x',R),('main',M)]},'original_C04_support_before_retained':True,'primary_rows_changed':False,'second_prior_support_changed':False,'new_gate_helpers_changed':False,'compiler_executed':False,'canonical_dispositions_changed':0,'g11_claim':'not-passed'};body=(json.dumps(out,indent=2)+'\n').encode()
for root in [R,M]:root.joinpath(P+'transition-v5-final.json').write_bytes(body)
print(json.dumps(out['source_refs'],indent=2))
