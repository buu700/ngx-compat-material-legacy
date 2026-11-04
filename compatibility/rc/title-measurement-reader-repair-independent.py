# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent complete literal replay and strict one-row extension proof."""
from pathlib import Path
import json,hashlib,subprocess,sys,os,time
start=time.monotonic();results={};prefix='compatibility/rc/title-measurement-reader-repair-';manifest='compatibility/rc/historical-contract-repair-reader-inputs.json'
env=dict(os.environ,GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1')
for key in ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']:env.pop(key,None)
def original(root,parent,path):return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],cwd=root,env=env)
def identity(raw,ref):assert hashlib.sha256(raw).hexdigest()==ref['sha256'] and len(raw)==ref['bytes']
for line,root in [('21.x',Path(sys.argv[1])),('main',Path(sys.argv[2]))]:
 w=json.loads((root/(prefix+'worksheet.json')).read_text());data=json.loads((root/manifest).read_bytes());prior_raw=original(root,w['source_parent'],manifest);identity(prior_raw,w['prior_reader_registry']);prior=json.loads(prior_raw)
 old={row['path']:row for row in prior['tool_transitions']};new={row['path']:row for row in data['tool_transitions']};assert set(new)==set(old);assert len(new)==(15 if line=='21.x' else 7)
 if line=='21.x':
  assert data['extension_kind']=='title-measurement-reader';identity(prior_raw,data['prior_reader_registry']);assert data['prior_reader_registry']['source_parent']==w['source_parent'];assert data['source_parent']==prior['source_parent']
  for path,row in old.items():
   if path=='scripts/inventory-reference-owner.mjs':assert new[path]['before']==row['before'];assert new[path]['literal_edits'][:len(row['literal_edits'])]==row['literal_edits'];assert len(new[path]['literal_edits'])==len(row['literal_edits'])+4
   else:assert new[path]==row
 else:assert (root/manifest).read_bytes()==prior_raw
 for row in new.values():
  raw=original(root,row.get('source_parent',data['source_parent']),row['path']);identity(raw,row['before']);text=raw.decode()
  for edit in row['literal_edits']:assert text.count(edit['before'])==1;text=text.replace(edit['before'],edit['after'])
  identity(text.encode(),row['after']);assert text.encode()==(root/row['path']).read_bytes()
 transition=json.loads((root/(prefix+'transitions.json')).read_text())
 for row in transition['transitions']:
  raw=original(root,w['source_parent'],row['path']);identity(raw,row['before']);text=raw.decode()
  for edit in row['new_literal_edits']:assert text.count(edit['before'])==1;text=text.replace(edit['before'],edit['after'])
  identity(text.encode(),row['after']);assert text.encode()==(root/row['path']).read_bytes()
 for ref in w['protected_inputs']:identity((root/ref['path']).read_bytes(),ref)
 results[line]={'complete_tool_rows_derived':len(new),'tool_rows_added':0,'prior_unselected_rows_preserved':len(new)-(1 if line=='21.x' else 0),'current_inventory_owner_changed':line=='21.x','protected_inputs_unchanged':True}
report={'schema_version':1,'status':'pass','lines':results,'seconds':time.monotonic()-start,'source_boundary_only':True,'full_source_owner_or_native_packed_floor_or_audit_qualified':False,'g11_claim':'not-passed'};out=Path(sys.argv[3]);assert not out.exists();out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
