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
cutpath='compatibility/rc/parallel-spinner-snack-gate-integration-physical-closure-support-cut-v3.json';raw=(R/cutpath).read_bytes();assert sha(raw)=='337fa1fe6182e4e63b38c237259928c967726aea01f1401516d7e9fd7a6fe1be';cut=json.loads(raw);pending={};rows={}
oldpins={'21.x':'abcbb513ef77b5cfc50114839a4f28ef8fd7f35deb096107b17027d7bca72ec3','main':'11bfccacfa82a86051c98b2a6fe25d9db7d64aaccf16346e812efe56e798d8b4'};pins={}
for line,root in [('21.x',R),('main',M)]:
 for row in cut['transitions']:assert ref(root,row['path'])=={'path':row['path'],**row['after']}
 for row in cut['frozen_inputs_unchanged']:assert ref(root,row['path'])==row
 before=(root/MF).read_bytes();assert sha(before)==oldpins[line];data=json.loads(before);proof=data['gate_tool_successor']['rolled_forward_c04_support'];assert proof['before']['sha256']=='a36fb7a3d2041460378352730f44916a29790cb30d7a5c0880dc39a74f1a90b2';assert proof['after']['sha256']=='fa295c401fb7c4f03bee4fe4592655a1f16e6a924aaa010973382a7b24ebb77c'
 original_body=original(root,proof['source_parent'],proof['path']);assert sha(original_body)==proof['before']['sha256'];after=(root/proof['path']).read_bytes();proof['after']=ref(root,proof['path']);proof['literal_edits']=edits(original_body,after);data['support_inputs'][0]=dict(proof['after'])
 out=(json.dumps(data,indent=2)+'\n').encode();pending[(line,MF)]=out;pins[line]=sha(out);rows[line]={'old_registry':{'sha256':sha(before),'bytes':len(before)},'new_registry':{'sha256':sha(out),'bytes':len(out)},'only_registry_fields_changed':['support_inputs[0]','gate_tool_successor.rolled_forward_c04_support.after','gate_tool_successor.rolled_forward_c04_support.literal_edits']}
js=(R/JS).read_bytes();py=(R/PY).read_bytes();assert sha(js)=='691a9f57d7d123e022c759bb2cf4ba39d916b581c22bb93d905f11eba9c48396';assert sha(py)=='4863bb9ad7585ac7885a55b476b8a7932adad8544a2dddebd1a7516ea8823fd1';assert (M/JS).read_bytes()==js and (M/PY).read_bytes()==py
for line in oldpins:
 assert js.count(oldpins[line].encode())==1 and py.count(oldpins[line].encode())==1;js=js.replace(oldpins[line].encode(),pins[line].encode());py=py.replace(oldpins[line].encode(),pins[line].encode())
for line in oldpins:pending[(line,JS)]=js;pending[(line,PY)]=py
for (line,path),body in pending.items():(R if line=='21.x'else M).joinpath(path).write_bytes(body)
out={'schema_version':1,'role':'Final private/internal versus public boundary C04 support0 only refinement; active source guards unchanged except exact registry pins','support_cut':{'path':cutpath,'sha256':sha(raw),'bytes':len(raw)},'branches':rows,'source_refs':{line:[ref(root,p)for p in [MF,JS,PY]]for line,root in [('21.x',R),('main',M)]},'original_C04_support_before_retained':True,'primary_rows_changed':False,'second_prior_support_changed':False,'new_gate_helpers_changed':False,'compiler_executed':False,'canonical_dispositions_changed':0,'g11_claim':'not-passed'};body=(json.dumps(out,indent=2)+'\n').encode()
for root in [R,M]:root.joinpath(P+'transition-v4-final.json').write_bytes(body)
print(json.dumps(out['source_refs'],indent=2))
