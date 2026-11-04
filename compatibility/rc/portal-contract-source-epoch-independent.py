# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent exact registry extension and portal resource epoch metadata."""
from pathlib import Path
import json,gzip,hashlib,subprocess,sys,time
prefix='compatibility/rc/portal-contract-source-epoch-';manifest='compatibility/rc/historical-contract-repair-reader-inputs.json';results={};start=time.monotonic()
def identity(b,r):assert hashlib.sha256(b).hexdigest()==r['sha256']and len(b)==r['bytes']
def original(r,parent,p):return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+p],cwd=r)
for line,r in [('21.x',Path(sys.argv[1])),('main',Path(sys.argv[2]))]:
 w=json.loads((r/(prefix+'worksheet.json')).read_bytes());d=json.loads((r/manifest).read_bytes());ref=d['prior_reader_registry'];raw=original(r,ref['source_parent'],manifest);identity(raw,ref);before=json.loads(raw);old={x['path']:x for x in before['tool_transitions']};new={x['path']:x for x in d['tool_transitions']};assert set(new)-set(old)=={'scripts/dialog-portal-failure-recovery.mjs'};assert set(old)-set(new)==set();assert len(new)==(15 if line=='21.x' else 7)
 for p,row in old.items():
  if p=='scripts/snack-dom-source-context.mjs':assert row['before']==new[p]['before'];assert new[p]['literal_edits'][:len(row['literal_edits'])]==row['literal_edits']
  else:assert row==new[p]
 for row in new.values():
  raw=original(r,row.get('source_parent',d['source_parent']),row['path']);identity(raw,row['before']);s=raw.decode()
  for e in row['literal_edits']:assert s.count(e['before'])==1;s=s.replace(e['before'],e['after'])
  identity(s.encode(),row['after']);assert s.encode()==(r/row['path']).read_bytes()
 t=json.loads((r/(prefix+'transitions.json')).read_bytes())
 for row in t['transitions']:
  b=original(r,w['source_parent'],row['path']);identity(b,row['before']);s=b.decode()
  for e in row['new_literal_edits']:assert s.count(e['before'])==1;s=s.replace(e['before'],e['after'])
  identity(s.encode(),row['after']);assert s.encode()==(r/row['path']).read_bytes()
 for ref in w['protected_inputs']:identity((r/ref['path']).read_bytes(),ref)
 prior=json.loads(gzip.decompress((r/'compatibility/rc/dialog-portal-failure-recovery-prior.json.gz').read_bytes()));images=json.loads((r/'compatibility/rc/historical-contract-repair-source-inputs.json').read_bytes())['images'];members={x['path']:x for x in prior['product_members']};repairs=[x for x in images if x['path']in members];assert len(repairs)==4;menu=next(x for x in repairs if x['path'].endswith('/menu-base.ts'));assert menu['before']['sha256']!=members[menu['path']]['sha256']
 results[line]={'prior_rows_preserved':len(old),'tool_rows':len(new),'one_portal_row_added':True,'only_snack_row_suffix_extended':True,'original_portal_resource_population':len(members),'independently_current_contract_repairs':4,'prepacked_menu_metadata_is_distinct':True,'protected_inputs_unchanged':True}
report={'schema_version':1,'status':'pass','seconds':time.monotonic()-start,'lines':results,'full_owner_or_native_packed_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'};out=Path(sys.argv[3]);assert not out.exists();out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
