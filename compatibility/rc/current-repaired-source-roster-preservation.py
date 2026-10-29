# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent exact metadata preservation; does not import the Node producer."""
from pathlib import Path
import sys,json,hashlib,subprocess,copy,time
roots={'21.x':Path(sys.argv[1]),'main':Path(sys.argv[2])};prefix='compatibility/rc/current-repaired-source-roster-';started=time.monotonic();lines={}
def digest(b):return hashlib.sha256(b).hexdigest()
def key(r):return (r['file'],r['module'],r['symbol'])
def original(root,parent,path):return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],cwd=root)
for line,root in roots.items():
 w=json.loads((root/(prefix+'worksheet.json')).read_bytes());review_path='compatibility/f10/authored-use-reviews/current-repaired-source-integration.json';review_raw=(root/review_path).read_bytes();review=json.loads(review_raw);rref={'path':review_path,'sha256':digest(review_raw),'bytes':len(review_raw)};cases={key(r):r for r in review['reviews']};proof=json.loads((root/(prefix+'preparation-proof.json')).read_bytes());plan={key(r):r for r in proof['integrated_cases']};assert len(cases)==len(plan)==175
 old_review=json.loads((root/'compatibility/f10/authored-use-reviews/base-class-removal-current-uses.json').read_bytes());base={key(r):r for r in old_review['reviews']};assert len(base)==95
 tool=proof['exact_tool_transition'];before_tool=original(root,tool['source_parent'],tool['path']);assert digest(before_tool)==tool['before']['sha256'];text=before_tool.decode()
 for e in tool['literal_edits']:assert text.count(e['before'])==1;text=text.replace(e['before'],e['after'])
 assert text.encode()==(root/tool['path']).read_bytes();assert digest(text.encode())==tool['after']['sha256']
 changed={};all_old={};added=[]
 for name in ['frozen','extra']:
  path='compatibility/f10/authored-dependency-'+('dispositions'if name=='frozen'else'current-dispositions')+'.json';before_raw=original(root,w['source_parent'],path);before=json.loads(before_raw);after=json.loads((root/path).read_bytes());assert before['line']==after['line']==line
  assert (root/path).read_bytes()==(root/(prefix+'proposed-'+('frozen'if name=='frozen'else'additional')+'.json')).read_bytes()
  bkeys=[key(r)for r in before['symbol_uses']];akeys=[key(r)for r in after['symbol_uses']];assert akeys[:len(bkeys)]==bkeys;assert len(set(akeys))==len(akeys);all_old.update({key(r):r for r in before['symbol_uses']});amap={key(r):r for r in after['symbol_uses']};n=0
  for row in before['symbol_uses']:
   current=amap[key(row)];expected=copy.deepcopy(row)
   if key(row)in cases:
    expected['source_review']=rref;assert current['source_review_history'][:-1]==row.get('source_review_history',[]);entry=current['source_review_history'][-1];assert entry['prior_source_review']==row['source_review'];assert entry['recorded_at_utc']==w['recorded_at_utc'];assert len(entry['reason'])>80;expected['source_review_history']=current['source_review_history'];n+=1
   if name=='extra':
    if key(row)in cases:expected['candidate_source_sha256']=cases[key(row)]['candidate_source_sha256']
    assert current['occurrences']==row['occurrences']
   assert current==expected,('unexplained row edit',line,key(row))
  changed[name]=n
  if name=='frozen':
   assert len(akeys)==1736;assert after['frozen_roster']==before['frozen_roster'];assert {k:v for k,v in after.items()if k not in ['symbol_uses','note']}=={k:v for k,v in before.items()if k not in ['symbol_uses','note']}
  else:
   assert len(akeys)==317;added=[amap[k]for k in akeys if k not in set(bkeys)];assert len(added)==2;assert {(r['module'],r['symbol'])for r in added}=={('@angular/material/form-field/testing','MatErrorHarness'),('@angular/material/snack-bar','MatSnackBarRef')}
   assert after['retained_removed_additional_uses']==before['retained_removed_additional_uses'];assert len(after['retained_removed_additional_uses'])==2;assert after['source_snapshot_history'][:-1]==before['source_snapshot_history'];assert after['source_snapshot_history'][-1]['ledger_sha256']==digest(before_raw)
   assert after['symbol_use_count']==317 and after['live_symbol_use_count']==315 and after['current_uses']==1965 and after['current_source_files']==532
   allowed=['symbol_uses','recorded_at_utc','current_source_population_sha256','current_uses','current_source_files','symbol_use_count','live_symbol_use_count','source_snapshot_history'];assert {k:v for k,v in after.items()if k not in allowed}=={k:v for k,v in before.items()if k not in allowed}
 for ident,r in cases.items():
  assert r['candidate_source_sha256']==digest((root/'projects/ngx-material-legacy'/r['file']).read_bytes());deps={e['path']:e for e in r['independent_evidence']};old=all_old.get(ident)
  if ident in base:assert r['decision']==base[ident]['decision'];assert r['conclusion']==base[ident]['conclusion']
  if old:
   assert r['prior_source_review']==old['source_review'];ref=old['source_review'];raw=(root/ref['path']).read_bytes();assert digest(raw)==ref['sha256'];body=json.loads(raw);prior=next(x for x in body['reviews']if key(x)==ident);assert r['prior_decision']==prior['decision']
   if ident not in base:assert r['conclusion']==prior['conclusion']
   for e in prior['independent_evidence']:
    assert e['path']in deps
    if e['path']==tool['path']and e['sha256']==tool['before']['sha256']:assert deps[e['path']]['sha256']==tool['after']['sha256']
    else:assert deps[e['path']]['sha256']==e['sha256']
  for e in r['independent_evidence']:assert digest((root/e['path']).read_bytes())==e['sha256']
 for group in ['original_inputs','protected_inputs']:
  for ref in w[group]:
   if ref['path'].endswith(('authored-dependency-dispositions.json','authored-dependency-current-dispositions.json')):continue
   raw=(root/ref['path']).read_bytes();assert digest(raw)==ref['sha256']and len(raw)==ref['bytes']
 assert changed=={'frozen':140,'extra':33}
 lines[line]={'changed_frozen':140,'changed_additional':33,'new_imports':2,'frozen_keys_retained':1736,'original_additional_keys_retained':315,'current_additional_obligations':317,'retirements_retained':2,'integrated_cases':175,'prior_direct_evidence_preserved':True}
report={'schema_version':1,'status':'pass','seconds':time.monotonic()-started,'lines':lines,'full_shipped_current_admission_qualified':False,'current_native_packed_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'};Path(sys.argv[3]).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'status':'pass','seconds':report['seconds'],'lines':lines}))
