# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independently replay exact before metadata and the sole snack-reader extension."""
from pathlib import Path
import json,hashlib,subprocess,sys,time
roots={'21.x':Path(sys.argv[1]),'main':Path(sys.argv[2])};prefix='compatibility/rc/current-roster-source-epoch-';results={};started=time.monotonic()
def digest(b):return hashlib.sha256(b).hexdigest()
def original(r,parent,path):return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],cwd=r)
for line,r in roots.items():
 w=json.loads((r/(prefix+'worksheet.json')).read_bytes());d=json.loads((r/(prefix+'inputs.json')).read_bytes());before=[];after=[]
 for ref in d['before_rosters']:
  raw=original(r,d['before_source_parent'],ref['path']);assert digest(raw)==ref['sha256']and len(raw)==ref['bytes'];before.append(json.loads(raw))
 for ref in d['after_rosters']:
  raw=(r/ref['path']).read_bytes();assert digest(raw)==ref['sha256']and len(raw)==ref['bytes'];after.append(json.loads(raw))
 key=lambda x:(x['file'],x['module'],x['symbol']);assert [key(x)for x in before[0]['symbol_uses']]==[key(x)for x in after[0]['symbol_uses']];assert [key(x)for x in before[1]['symbol_uses']]==[key(x)for x in after[1]['symbol_uses'][:315]];assert len(after[1]['symbol_uses'])==317;assert after[1]['retained_removed_additional_uses']==before[1]['retained_removed_additional_uses']
 manifest='compatibility/rc/historical-contract-repair-reader-inputs.json';data=json.loads((r/manifest).read_bytes());prior_ref=data['prior_reader_registry'];raw=original(r,prior_ref['source_parent'],manifest);assert digest(raw)==prior_ref['sha256']and len(raw)==prior_ref['bytes'];prior=json.loads(raw);old={x['path']:x for x in prior['tool_transitions']};new={x['path']:x for x in data['tool_transitions']};assert set(old)==set(new);assert len(new)==(13 if line=='21.x' else 5)
 for path,row in old.items():
  if path!='scripts/snack-dom-source-context.mjs':assert row==new[path]
  else:assert row['before']==new[path]['before'];assert new[path]['literal_edits'][:len(row['literal_edits'])]==row['literal_edits']
  current=new[path];raw=original(r,current.get('source_parent',data['source_parent']),path);assert digest(raw)==current['before']['sha256'];text=raw.decode()
  for e in current['literal_edits']:assert text.count(e['before'])==1;text=text.replace(e['before'],e['after'])
  assert text.encode()==(r/path).read_bytes();assert digest(text.encode())==current['after']['sha256']
 transition=json.loads((r/(prefix+'tool-transition.json')).read_bytes());text=original(r,w['source_parent'],transition['path']).decode()
 for e in transition['new_literal_edits']:assert text.count(e['before'])==1;text=text.replace(e['before'],e['after'])
 assert text.encode()==(r/transition['path']).read_bytes();assert 'read:rosterEpoch.metadataRead' in text
 for ref in w['protected_inputs']:
  raw=(r/ref['path']).read_bytes();assert digest(raw)==ref['sha256']and len(raw)==ref['bytes']
 results[line]={'before_frozen':len(before[0]['symbol_uses']),'before_additional':len(before[1]['symbol_uses']),'after_frozen':len(after[0]['symbol_uses']),'after_additional':len(after[1]['symbol_uses']),'prior_tool_rows_preserved':len(old),'only_snack_literal_suffix_changed':True,'protected_product_or_canonical_inputs_changed':0}
report={'schema_version':1,'status':'pass','seconds':time.monotonic()-started,'lines':results,'full_owner_or_native_packed_browser_floor_or_audit_qualified':False,'g11_claim':'not-passed'};Path(sys.argv[3]).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'status':'pass','seconds':report['seconds'],'lines':results}))
