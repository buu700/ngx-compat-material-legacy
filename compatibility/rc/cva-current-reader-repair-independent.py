# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent exact predecessor replay and protected-input preservation."""
from pathlib import Path
import json,hashlib,subprocess,sys,time
prefix='compatibility/rc/cva-current-reader-repair-';manifest='compatibility/rc/historical-contract-repair-reader-inputs.json';results={};start=time.monotonic()
def digest(b):return hashlib.sha256(b).hexdigest()
def original(r,parent,path):return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],cwd=r)
def identity(raw,ref):assert digest(raw)==ref['sha256']and len(raw)==ref['bytes']
for line,r in [('21.x',Path(sys.argv[1])),('main',Path(sys.argv[2]))]:
 w=json.loads((r/(prefix+'worksheet.json')).read_bytes());d=json.loads((r/manifest).read_bytes());p=d['prior_reader_registry'];before=original(r,p['source_parent'],manifest);identity(before,p);prior=json.loads(before);old={a['path']:a for a in prior['tool_transitions']};new={a['path']:a for a in d['tool_transitions']};assert set(new)-set(old)=={'scripts/packed-cva-source-requalification.mjs'};assert set(old)-set(new)==set();assert len(new)==(14 if line=='21.x' else 6)
 for path,row in old.items():
  if path=='scripts/dialog-title-source-context.mjs':assert row['before']==new[path]['before'];assert new[path]['literal_edits'][:len(row['literal_edits'])]==row['literal_edits']
  else:assert row==new[path]
 for row in new.values():
  raw=original(r,row.get('source_parent',d['source_parent']),row['path']);identity(raw,row['before']);text=raw.decode()
  for e in row['literal_edits']:assert text.count(e['before'])==1;text=text.replace(e['before'],e['after'])
  raw=text.encode();identity(raw,row['after']);assert raw==(r/row['path']).read_bytes()
 for ref in w['protected_inputs']:identity((r/ref['path']).read_bytes(),ref)
 cva=(r/'scripts/packed-cva-source-requalification.mjs').read_text();assert 'dialogTitleReaderSubject'not in cva;assert cva.count('nativeSpec.titleReaders.withHistoricalToolMetadata')==2;assert 'packed.contract_preimages.has(path)'in cva
 results[line]={'prior_tool_rows_preserved':len(old),'new_CVA_row':1,'only_existing_title_row_extended':True,'all_current_tool_images_derived':len(new),'protected_product_or_canonical_inputs_changed':0}
report={'schema_version':1,'status':'pass','seconds':time.monotonic()-start,'lines':results,'full_owner_or_native_packed_browser_floor_or_audit_qualified':False,'g11_claim':'not-passed'};out=Path(sys.argv[3]);assert not out.exists();out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
