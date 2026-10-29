# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent both-line literal derivation and rejection controls; no Node marker."""
from pathlib import Path
import sys,json,hashlib,time
from unittest.mock import patch
roots={'21.x':Path(sys.argv[1]),'main':Path(sys.argv[2])};sys.path.insert(0,str(roots['21.x']/'tests'))
import historical_contract_repair_source as subject
started=time.monotonic();results={};bindings=[]
for line,root in roots.items():
 data=subject._tool_data(root);assert data['line']==line;prior_ref=data['prior_reader_registry'];prior_raw=subject._original(str(root),prior_ref['source_parent'],prior_ref['path']);subject._identity(prior_raw,prior_ref);prior=json.loads(prior_raw)
 old={row['path']:row for row in prior['tool_transitions']};new={row['path']:row for row in data['tool_transitions']};assert all(new[path]==row for path,row in old.items());assert [row['path']for row in data['tool_transitions']if row['path']not in old]==(['scripts/inventory-reference-owner.mjs']if line=='21.x'else['scripts/inventory-reference-owner.mjs','scripts/browser-owner-source.mjs'])
 rejected=0
 for row in data['tool_transitions']:
  for side in ['before','after']:
   ref={'path':row['path'],**row[side]};assert subject.qualify_tool_reference(ref,root)=={'path':row['path'],**row['after']};raw=subject.tool_comparison_bytes(ref,root);subject._identity(raw,row[side])
  for bad in [{'path':row['path'],**row['before'],'sha256':'0'*64},{'path':row['path'],**row['before'],'bytes':row['before']['bytes']+1}]:
   try:subject.qualify_tool_reference(bad,root)
   except AssertionError:rejected+=1
   else:raise AssertionError('unreviewed reference accepted')
  saved=subject._read
  def altered(r,path,selected=row['path']):
   raw=saved(r,path);return raw+b'\n/* test mutation */\n'if path==selected else raw
  with patch.object(subject,'_read',altered):
   try:subject.qualify_tool_reference({'path':row['path'],**row['before']},root)
   except AssertionError:rejected+=1
   else:raise AssertionError('changed actual reader accepted')
  raw=(root/row['path']).read_bytes();bindings.append({'line':line,'path':row['path'],'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)})
 results[line]={'tool_rows':len(new),'predecessor_rows_preserved':len(old),'references_derived':len(new)*2,'rejections':rejected}
report={'schema_version':1,'status':'pass','seconds':time.monotonic()-started,'lines':results,'current_tool_bindings':bindings,'old_programs_executed':False,'current_native_packed_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'}
Path(sys.argv[3]).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'status':'pass','seconds':report['seconds'],'lines':results}))
