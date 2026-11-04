# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independently replay every finite tool image and preserve all prior rows except the snack suffix."""
from pathlib import Path
import json,hashlib,subprocess,sys,time
prefix='compatibility/rc/snack-current-owner-repair-';manifest='compatibility/rc/historical-contract-repair-reader-inputs.json';results={};start=time.monotonic()
def digest(b):return hashlib.sha256(b).hexdigest()
def original(r,parent,path):return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],cwd=r)
def identity(b,ref):assert digest(b)==ref['sha256']and len(b)==ref['bytes']
for line,r in [('21.x',Path(sys.argv[1])),('main',Path(sys.argv[2]))]:
 w=json.loads((r/(prefix+'worksheet.json')).read_bytes());d=json.loads((r/manifest).read_bytes());p=d['prior_reader_registry'];b=original(r,p['source_parent'],manifest);identity(b,p);prior=json.loads(b);old={x['path']:x for x in prior['tool_transitions']};new={x['path']:x for x in d['tool_transitions']};assert set(old)==set(new);assert len(new)==(14 if line=='21.x' else 6)
 for path,row in old.items():
  if path=='scripts/snack-dom-source-context.mjs':assert row['before']==new[path]['before'];assert new[path]['literal_edits'][:len(row['literal_edits'])]==row['literal_edits']
  else:assert row==new[path]
 for row in new.values():
  b=original(r,row.get('source_parent',d['source_parent']),row['path']);identity(b,row['before']);s=b.decode()
  for e in row['literal_edits']:assert s.count(e['before'])==1;s=s.replace(e['before'],e['after'])
  identity(s.encode(),row['after']);assert s.encode()==(r/row['path']).read_bytes()
 t=json.loads((r/(prefix+'owner-transition.json')).read_bytes());b=original(r,w['source_parent'],t['path']);identity(b,t['before']);s=b.decode()
 for e in t['new_literal_edits']:assert s.count(e['before'])==1;s=s.replace(e['before'],e['after'])
 assert s.encode()==(r/t['path']).read_bytes();identity(s.encode(),t['after'])
 for ref in w['protected_inputs']:identity((r/ref['path']).read_bytes(),ref)
 results[line]={'prior_tool_rows_preserved':len(old),'new_tool_rows':0,'only_snack_literal_suffix_extended':True,'owner_literal_edits':len(t['new_literal_edits']),'canonical_API113_and_current_rosters_unchanged':True}
report={'schema_version':1,'status':'pass','seconds':time.monotonic()-start,'lines':results,'full_owner_or_native_packed_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'};out=Path(sys.argv[3]);assert not out.exists();out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
