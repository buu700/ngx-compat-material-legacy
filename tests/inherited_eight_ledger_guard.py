#!/usr/bin/env python3
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Guard the exact eight reviewed row transitions against ambiguous patch placement."""
import copy,hashlib,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE='8baa761eca624c9d71293c3d31750a2b3fdeebf0'
LEDGER='compatibility/f10/disposition-ledger/ledger.json'
BASE_SHA='331386de118b7fe8440a9c490df9b8fa080b3bcb0a660f5e823e5e3f4ba9c035'
EXPECTED={'01cc6f3265903cc6c3a58ea4ae5e03c917597e8f': '9c910017ff0ce21d4e6df383455a50aaa91ea870033533dbf10574f9683e08be', '09df51d8ebb86a3ee76614b6775dd62136660567': 'ba15d7c7b1cf915620be4a804c7c09cda88632b4ecacb6af6e66cdd7ea2c32f9', '3b6ca5c9880996b57e08caffb408f6c12ed78de4': '444d9c6af2687af0e9d0510a8c0ea96a6f9c1315637585acd649a9c4fd719ce6', '27dae25a420e76817a1209f373326084ae6dd11c': 'bea0ee22b106d70799b8a951d41678131e2bbc279a50e09426a1a2d5f21fb6c4', '1a92e22eff7728d92b6af8834701f78acbb4d2cc': 'ea4fa2192ad5c1a567e49f3829430b16e9c83c7fe532533ea4b2b4fa07310b2d', '0ca0c3112c762f449673f5cc1f3f4d7e8e3c20af': '68521cd6d002ed03911d3b08a9f19c190682f9870d0e5233aeb764ccee4f8b55', '332f78607b409c7158e7153ef0ed044a09922a99': '0a63cd6e08a99787b0c35b7ab6d4141d06f0bac9b7eb327fb344cd0583c8b8ba', '59b8f433c28e81c213668ccf7d220f12e3524635': 'bf306c252bf989e6db55a453074a2de7a751dd7de8e062968906a098b41cf13d'}
sha=lambda b:hashlib.sha256(b).hexdigest()
def rowhash(x):return sha(json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode())
def check(old,new):
 assert set(old)==set(new) and all(old[k]==new[k] for k in old if k!='entries')
 a,b=old['entries'],new['entries'];assert len(a)==len(b)==1697
 assert [x['sha'] for x in a]==[x['sha'] for x in b]
 changed=[(x,y) for x,y in zip(a,b) if x!=y];assert len(changed)==8 and {x['sha'] for x,y in changed}==set(EXPECTED)
 for x,y in changed:
  assert rowhash(y)==EXPECTED[x['sha']] and y['prior_disposition_record']==x and y['reason']==x['reason']
  assert y['diff_sha256']==y['individual_proof']['diff_sha256']
 return True
raw=subprocess.check_output(['git','--no-replace-objects','show',BASE+':'+LEDGER],cwd=ROOT);assert sha(raw)==BASE_SHA
old=json.loads(raw);new=json.loads((ROOT/LEDGER).read_bytes());assert check(old,new)
for x in new['entries']:
 if x['sha'] in EXPECTED:
  review=json.loads((ROOT/x['evidence_report']).read_bytes());assert review['sha']==x['sha'] and review['diff_sha256']==x['diff_sha256'];assert sha((ROOT/review['patch_file']).read_bytes())==x['diff_sha256']
mutants=[]
bad=copy.deepcopy(new);bad['entries'][0]['reason']='unrelated mutation';mutants.append(bad)
bad=copy.deepcopy(new);bad['entries'][0],bad['entries'][1]=bad['entries'][1],bad['entries'][0];mutants.append(bad)
for field in ('reason','diff_sha256','prior_disposition_record','individual_proof'):
 bad=copy.deepcopy(new);row=next(x for x in bad['entries'] if x['sha'] in EXPECTED);row[field]='wrong';mutants.append(bad)
for bad in mutants:
 try:check(old,bad)
 except (AssertionError,KeyError,TypeError):continue
 raise AssertionError('ledger corruption accepted')
print(json.dumps({'rows':1697,'changed':8,'nonselected_unchanged':True,'prior_rows_and_reasons_preserved':True,'mutants_rejected':len(mutants)}))
