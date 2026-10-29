# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent V1-to-V2 preservation plus original menu evidence inheritance."""
from pathlib import Path
import sys,json,hashlib,copy,time
roots={'21.x':Path(sys.argv[1]),'main':Path(sys.argv[2])};prefix='compatibility/rc/current-repaired-source-roster-';started=time.monotonic();results={}
def digest(b):return hashlib.sha256(b).hexdigest()
def key(r):return(r['file'],r['module'],r['symbol'])
for line,r in roots.items():
 amendment=json.loads((r/(prefix+'oracle-dependency-amendment.json')).read_bytes());review_path='compatibility/f10/authored-use-reviews/current-repaired-source-integration-v2.json';raw=(r/review_path).read_bytes();review=json.loads(raw);rref={'path':review_path,'sha256':digest(raw),'bytes':len(raw)};cases={key(x):x for x in review['reviews']};assert len(cases)==176;before_review=json.loads((r/amendment['v1_review']['path']).read_bytes());before_cases={key(x):x for x in before_review['reviews']};assert len(before_cases)==175
 assert all(cases[k]['decision']==v['decision']and cases[k]['conclusion']==v['conclusion']for k,v in before_cases.items())
 changed={}
 for archive in amendment['v1_applied_rosters']:
  b=(r/archive['archive']).read_bytes();assert digest(b)==archive['sha256'];before=json.loads(b);after=json.loads((r/archive['current_path']).read_bytes());assert [key(x)for x in after['symbol_uses']]==[key(x)for x in before['symbol_uses']];amap={key(x):x for x in after['symbol_uses']};n=0
  for row in before['symbol_uses']:
   expected=copy.deepcopy(row);actual=amap[key(row)]
   if key(row)in cases:
    assert actual['source_review_history'][:-1]==row.get('source_review_history',[]);assert actual['source_review_history'][-1]['prior_source_review']==row['source_review'];expected['source_review_history']=actual['source_review_history'];expected['source_review']=rref;n+=1
   assert actual==expected
  excluded=['symbol_uses','note']if'current-dispositions'not in archive['current_path']else['symbol_uses','recorded_at_utc','source_snapshot_history'];assert {k:v for k,v in after.items()if k not in excluded}=={k:v for k,v in before.items()if k not in excluded}
  if'current-dispositions'in archive['current_path']:assert after['source_snapshot_history'][:-1]==before['source_snapshot_history'];assert after['source_snapshot_history'][-1]['ledger_sha256']==digest(b)
  changed['additional'if'current-dispositions'in archive['current_path']else'frozen']=n
 assert changed=={'frozen':141,'additional':35}
 menu=json.loads((r/amendment['original_menu_scope']).read_bytes());supplements=[x for x in review['reviews']if x.get('retained_original_menu_scope')];assert len(supplements)==3
 for x in supplements:
  prior=next(v for v in menu['reviews']if key(v)==key(x));deps={v['path']:v for v in x['independent_evidence']}
  for e in prior['independent_evidence']:assert deps[e['path']]['sha256']==e['sha256'];assert digest((r/e['path']).read_bytes())==e['sha256']
 for k,x in before_cases.items():
  deps={v['path']:v for v in cases[k]['independent_evidence']}
  for e in x['independent_evidence']:assert deps[e['path']]['sha256']==e['sha256']
 results[line]={'cases':176,'frozen_updates':141,'additional_updates':35,'all_V1_keys_and_histories_preserved':True,'original_menu_scope_direct_dependencies_preserved':3}
report={'schema_version':1,'status':'pass','seconds':time.monotonic()-started,'lines':results,'full_shipped_current_admission_qualified':False,'current_native_packed_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'};Path(sys.argv[3]).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'status':'pass','seconds':report['seconds'],'lines':results}))
