# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Independent byte-level reconstruction of exactly seven decisions and three digests."""
from pathlib import Path
import json,gzip,hashlib,os,subprocess,sys
r=Path(__file__).resolve().parents[1]
h=lambda b:hashlib.sha256(b).hexdigest()
p='compatibility/f10/disposition-ledger/ledger.json'
env={**os.environ,'GIT_NO_LAZY_FETCH':'1','GIT_NO_REPLACE_OBJECTS':'1'}
for key in ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']:env.pop(key,None)
before=subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',
 '14d4ae08fa58552c858fde5cd597156d555feeba:'+p],cwd=r,env=env)
text=before.decode();ledger=json.loads(text)
assert h(before)=='b67ce71a34e33e8fa631216eab5912f388fb04aaf100790829d7df9531d6b1b6'
packet_bytes=(r/'compatibility/rc/upstream-testing-api-21x-ledger-transition.json.gz').read_bytes()
assert h(packet_bytes)=='cd65646ca6055cac2cd23077d6bcf75c66f7c111666de703227efcc018d2a3e1'
packet=json.loads(gzip.decompress(packet_bytes))
review=json.loads((r/'compatibility/rc/upstream-testing-api-21x-individual-admission.json').read_bytes())
spans={};decoder=json.JSONDecoder()
def parse(pos,path=()):
 while text[pos].isspace():pos+=1
 start=pos
 if text[pos]=='{':
  pos+=1
  while True:
   while text[pos].isspace():pos+=1
   if text[pos]=='}':pos+=1;break
   key,pos=decoder.raw_decode(text,pos)
   while text[pos].isspace():pos+=1
   assert text[pos]==':';pos=parse(pos+1,path+(key,))
   while text[pos].isspace():pos+=1
   if text[pos]==',':pos+=1
   else:assert text[pos]=='}'
 elif text[pos]=='[':
  pos+=1;i=0
  while True:
   while text[pos].isspace():pos+=1
   if text[pos]==']':pos+=1;break
   pos=parse(pos,path+(i,));i+=1
   while text[pos].isspace():pos+=1
   if text[pos]==',':pos+=1
   else:assert text[pos]==']'
 else:_,pos=decoder.raw_decode(text,pos)
 spans[path]=(start,pos);return pos
parse(0)
bysha={row['sha']:i for i,row in enumerate(ledger['entries'])};edits=[];changed=[]
for item in packet['entries']:
 i=bysha[item['sha']];old=ledger['entries'][i];new=item['after_entry'];row=next(x for x in review['reviews'] if x['sha']==item['sha'])
 assert h((json.dumps(old,indent=2,ensure_ascii=False)+'\n').encode())==row['prior_entry_sha256']
 allowed={'final_disposition','reason','review_depth','evidence_report','individual_proof'}
 assert {k:v for k,v in old.items() if k not in allowed}=={k:v for k,v in new.items() if k not in allowed}
 assert new['final_disposition']==row['final_disposition'] and new['reason']==row['decision']
 assert new['individual_proof']['diff_sha256']==row['diff_sha256']
 s,e=spans[('entries',i)];edits.append((s,e,json.dumps(new,indent=2,ensure_ascii=False).replace('\n','\n    ')));changed.append(item['sha'])
for item in packet['source_digest_updates']:
 i=bysha[item['sha']];path=tuple(item['path']);node=ledger['entries'][i]
 for part in path:node=node[part]
 assert node==item['before'];assert item['after']==h((r/'scripts/check-upstream-audit-disposition.mjs').read_bytes())
 s,e=spans[('entries',i)+path];assert json.loads(text[s:e])==item['before'];edits.append((s,e,json.dumps(item['after'])));changed.append(item['sha'])
chunks=[];end=0
for s,e,new in sorted(edits):assert s>=end;chunks.extend([text[end:s],new]);end=e
chunks.append(text[end:]);after=''.join(chunks).encode()
assert len(changed)==len(set(changed))==10
assert after==(r/p).read_bytes()
assert h(after)==packet['after_sha256']
afterrows=json.loads(after)['entries'];assert len(afterrows)==len(ledger['entries'])==1697
assert [e['sha'] for e in afterrows]==[e['sha'] for e in ledger['entries']]
assert [old['sha'] for old,new in zip(ledger['entries'],afterrows) if old!=new]==[e['sha'] for e in ledger['entries'] if e['sha'] in changed]
report={'line':'21.x','result':'pass','independent_parser':'Python JSON scalar/object spans, independent of TypeScript AST',
 'entries':1697,'individual_decisions_changed':7,'existing_checker_proof_digests_changed':3,'whole_entry_or_scalar_edits':10,
 'unrelated_entry_or_byte_changes':0,'before_sha256':h(before),'after_sha256':h(after),'changed_sha_ids':changed,
 'full_native_floor_or_g11_qualified':False}
report['producer_sha256']=h(Path(__file__).read_bytes())
if len(sys.argv)>1:
 with open(sys.argv[1],'x') as output:output.write(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='changed_sha_ids'}))
