# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE.
"""Finite two-line support proof controls; no supplied-read callback or compiler."""
from pathlib import Path
import copy,hashlib,importlib.util,json,sys
from unittest.mock import patch
ROOT=Path.cwd();MAIN=Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy');P='compatibility/rc/parallel-spinner-snack-public-bridge-gate-successor-';rows=[]
for line,root in [('21.x',ROOT),('main',MAIN)]:
 spec=importlib.util.spec_from_file_location('gate_successor_support_'+line,root/'tests/historical_contract_repair_source.py');s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s);data=s._tool_data(root);assert len(data['tool_transitions'])==(45 if line=='21.x'else 17);assert len(data['support_inputs'])==4
 proof=data['gate_tool_successor']['rolled_forward_c04_support'];assert proof['before']['sha256']=='a36fb7a3d2041460378352730f44916a29790cb30d7a5c0880dc39a74f1a90b2';assert proof['after']['sha256']=='27ef368c4da6c859e5e24fc8e43224198de14d4ce49fcbe361c3b545418708d3'
 for row in [data['tool_transitions'][0],data['tool_transitions'][-1]]:
  ref={'path':row['path'],**row['before'],'role':'historical-source-comparison'};qualified=s.qualify_tool_reference(ref,root);assert qualified=={**ref,**row['after']};assert s.digest(s.tool_comparison_bytes(ref,root))==row['before']['sha256']
 rejected=[]
 for label in ['support-before','support-after','support-path','support-parent','support-literal','second-prior-support']:
  bad=copy.deepcopy(data);p=bad['gate_tool_successor']['rolled_forward_c04_support']
  if label=='support-before':p['before']['sha256']='0'*64
  elif label=='support-after':p['after']['sha256']='0'*64
  elif label=='support-path':p['path']='scripts/foreign.mjs'
  elif label=='support-parent':p['source_parent']='0'*40
  elif label=='support-literal':p['literal_edits'][0]['after']+='\n/* unreviewed */'
  else:bad['support_inputs'][1]['sha256']='0'*64
  saved=s._registry
  def registry(candidate,path,pins):return bad if path==s.READERS else saved(candidate,path,pins)
  with patch.object(s,'_registry',registry):
   try:s._tool_data(root)
   except (AssertionError,KeyError):rejected.append(label)
   else:raise AssertionError('accepted '+label)
 saved=s._read
 for ref in data['support_inputs']:
  def changed(candidate,path,selected=ref['path']):
   raw=saved(candidate,path);return raw+b'\n/* copied source bytes */' if path==selected else raw
  with patch.object(s,'_read',changed):
   try:s._tool_data(root)
   except AssertionError:rejected.append('changed-physical-'+ref['path'])
   else:raise AssertionError('changed support accepted')
 s._tool_data(root);rows.append({'line':line,'tool_rows':len(data['tool_transitions']),'support_rows':4,'exact_original_comparisons_retained':2,'support_proof_and_physical_negatives_rejected':rejected,'restored_authentic_data_accepts':True})
out={'schema_version':1,'result':'pass','rows':rows,'Python_supplied_read_callback_seam_exists':False,'compiler_or_source_producer_executed':False,'real_inputs_mutated':False,'g11_claim':'not-passed'};path=Path(sys.argv[1]);assert not path.exists();path.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'result':'pass','lines':len(rows),'negatives':sum(len(r['support_proof_and_physical_negatives_rejected'])for r in rows)}))
