# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
"""Independent finite reader mirror controls; no Node/gate/compiler execution."""
from pathlib import Path
from unittest.mock import patch
import hashlib,importlib.util,json,sys
ROOT=Path.cwd();MAIN=Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy');P='compatibility/rc/parallel-spinner-snack-public-bridge-gate-successor-';positive=[];rejected=[]
for line,root in [('21.x',ROOT),('main',MAIN)]:
 spec=importlib.util.spec_from_file_location('gate_mirror_'+line.replace('.','_'),root/'tests/historical_contract_repair_source.py');subject=importlib.util.module_from_spec(spec);spec.loader.exec_module(subject)
 data=subject._tool_data(root);assert len(data['tool_transitions'])==(45 if line=='21.x'else 17);assert len(data['support_inputs'])==4
 prior=subject._prior_gate_registry(root,data);assert len(prior['tool_transitions'])==(39 if line=='21.x'else 11);positive.append(line+'/constructor-and-authenticated-prior')
 for row in data['tool_transitions']:
  for side in ['before','after']:
   for sized in [True,False]:
    ref={'path':row['path'],'sha256':row[side]['sha256'],'root':7,'role':'exact-tool-history'}
    if sized:ref['bytes']=row[side]['bytes']
    saved=dict(ref);result=subject.qualify_tool_reference(ref,root);assert ref==saved;assert result=={**saved,'sha256':row['after']['sha256'],**({'bytes':row['after']['bytes']}if sized else{})}
    raw=subject.tool_comparison_bytes(ref,root);assert subject.digest(raw)==row[side]['sha256'];assert len(raw)==row[side]['bytes'];positive.append(line+'/'+row['path']+'/'+side+'/'+str(sized))
  for mutation in [{'sha256':'0'*64},{'bytes':row['before']['bytes']+1}]:
   bad={'path':row['path'],**row['before'],**mutation}
   for method in [subject.qualify_tool_reference,subject.tool_comparison_bytes]:
    try:method(bad,root)
    except AssertionError:rejected.append(line+'/'+row['path']+'/'+method.__name__+'/'+next(iter(mutation)))
    else:raise AssertionError('wrong hash/size accepted')
 unknown={'path':'scripts/unknown-spinner-snack-tool.mjs','sha256':'0'*64,'root':7,'role':'unknown'};assert subject.qualify_tool_reference(unknown,root)==unknown;positive.append(line+'/unknown-not-qualified')
 original_read=subject._read
 for ref in data['support_inputs']:
  def altered(base,path,selected=ref['path']):
   raw=original_read(base,path);return raw+b'\n'if path==selected else raw
  with patch.object(subject,'_read',altered):
   try:subject._tool_data(root)
   except AssertionError:rejected.append(line+'/corrupt-support/'+ref['path'])
   else:raise AssertionError('support corruption accepted')
 original_git=subject._original
 def altered_git(base,parent,path):
  raw=original_git(base,parent,path);return raw+b'\n'if path==subject.READERS and parent==data['gate_tool_successor']['prior_reader_registry']['source_parent']else raw
 with patch.object(subject,'_original',altered_git):
  try:subject._tool_data(root)
  except AssertionError:rejected.append(line+'/corrupt-Git-prior-registry')
  else:raise AssertionError('corrupt predecessor registry accepted')
 subject._tool_data(root);positive.append(line+'/restored-authentic')
out={'schema_version':1,'result':'pass','positive':positive,'rejected':rejected,'counts':{'positive':len(positive),'rejected':len(rejected)},'old_program_or_compiler_or_gate_executed':False,'original_manifest_or_report_rewritten':False,'canonical_dispositions_changed':0,'g11_claim':'not-passed'}
p=Path(sys.argv[1]);assert not p.exists();p.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out['counts']))
