# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent byte-token inventory metadata derivation; no Node producer or canonical writes."""
from pathlib import Path
import copy,gzip,hashlib,importlib.util,json,os,re,subprocess
ROOT=Path(__file__).resolve().parents[1]
PINS={'main':('a0015ca03a0cd65405df754fdee30cfe95cbafac','121fa2c930784575a0ead888fb6d5caa03a4511aa5b90f7d88e69450df5a6da0',20),
      '21.x':('3aefef647f2237cca488d0b5de62cd2981f3dc7e','cc74f78b748c9b1226338b96a979558510ab72e50fea4c223cae45a76f4980a1',19)}
ledger_path='compatibility/f10/disposition-ledger/ledger.json';inventory_path='testing/legacy-runner/historical-inventory.json'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
line='21.x'if json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.')else'main'
parent,before_sha,count=PINS[line];env=dict(os.environ,GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1')
for key in ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']:env.pop(key,None)
before=subprocess.check_output(['git','--no-replace-objects','show',parent+':'+ledger_path],cwd=ROOT,env=env);assert sha(before)==before_sha
module=importlib.util.spec_from_file_location('independent_inventory_auth',ROOT/'scripts/historical_inventory_rebinding.py');owner=importlib.util.module_from_spec(module);module.loader.exec_module(owner);source=owner.verify_inventory_successor(ROOT)
old_inventory=source['before_inventory_sha256'];new_inventory=sha((ROOT/inventory_path).read_bytes());assert source['current_inventory_sha256']==new_inventory
expected=json.loads(before);updates={};old_refs=[]
for row in expected['entries']:
 for kind in ['historical_behavior','progress_csp_behavior','media_matcher_behavior','form_field_hover_behavior','content_observer_behavior','ripple_replay_behavior']:
  for ref in row.get('individual_proof',{}).get(kind,{}).get('source_members',[]):
   if ref.get('path')==inventory_path:
    assert ref['sha256']==old_inventory
    ref['sha256']=new_inventory;assert row['sha']not in updates;updates[row['sha']]=kind
assert len(updates)==count
text=before.decode();markers=list(re.finditer(r'^    \{\n      "sha": "([0-9a-f]{40})",\n',text,re.M));assert len(markers)==1697
end_of_entries=text.index('\n  ],',markers[-1].end());pieces=[];last=0
for index,marker in enumerate(markers):
 end=markers[index+1].start()if index+1<len(markers)else end_of_entries
 if marker.group(1)in updates:
  entry=text[marker.start():end];needle='"sha256": "'+old_inventory+'"';assert entry.count(needle)==1
  pieces.extend([text[last:marker.start()],entry.replace(needle,'"sha256": "'+new_inventory+'"')]);last=end
pieces.append(text[last:]);after=''.join(pieces).encode();assert json.loads(after)==expected and len(after)==len(before)
proposal=gzip.decompress((ROOT/'compatibility/rc/c04-inventory-reference-proposal-after.json.gz').read_bytes());assert proposal==after
packet=json.loads((ROOT/'compatibility/rc/c04-inventory-reference-proposal.json').read_bytes());assert packet['after_ledger']['sha256']==sha(after)
unchanged=sum(before[a.start():(markers[i+1].start()if i+1<len(markers)else end_of_entries)]==after[a.start():(markers[i+1].start()if i+1<len(markers)else end_of_entries)]for i,a in enumerate(markers))
assert unchanged==1697-count
print(json.dumps({'schema_version':1,'line':line,'independent_after_sha256':sha(after),'independent_after_bytes':len(after),'hash_scalar_replacements':count,'unselected_entry_bytes_preserved':unchanged,'canonical_ledger_unchanged':sha((ROOT/ledger_path).read_bytes())==before_sha,'canonical_owner_integration_complete':False,'actual_native_packed_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'}))
