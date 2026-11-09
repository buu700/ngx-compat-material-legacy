import os,json,hashlib,subprocess,stat
from pathlib import Path
root=Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy'); base=Path('/home/parallels/.codex/closeout-state/2026-11-07-recovery/frozen-public-bidi-source-successor-v1'); data=json.loads((base/'candidate-source-data.json').read_bytes()); draft=json.loads((base/'candidate-review-records.json').read_bytes()); sha=lambda b:hashlib.sha256(b).hexdigest(); read=lambda p:(root/p).read_bytes(); env={k:v for k,v in os.environ.items() if not k.startswith('GIT_')};env.update({'GIT_NO_REPLACE_OBJECTS':'1','GIT_NO_LAZY_FETCH':'1','GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_GLOBAL':'/dev/null','GIT_TERMINAL_PROMPT':'0'});git=lambda *a:subprocess.check_output(['git','--no-replace-objects','-c','core.hooksPath=/dev/null',*a],cwd=root,env=env); old=lambda c,p:git('show',f'{c}:{p}'); key=lambda x:tuple(x.get(k) for k in ('file','module','symbol'))
assert git('rev-parse','HEAD').decode().strip()=='7e9ecb0a8fe31d44c1f37b8a509fc58c6ab705ad'; seed=json.loads(read(data['frozen_seed']['path'])); review=json.loads(read(data['frozen_review']['path'])); ledger=json.loads(read('compatibility/f10/authored-dependency-dispositions.json'));assert sha(read(data['frozen_seed']['path']))==data['frozen_seed']['sha256'];assert sha(read(data['frozen_review']['path']))==data['frozen_review']['sha256'];wanted=[r for r in seed['symbol_uses'] if r['module']=='@angular/cdk/bidi' and r['symbol']=='BidiModule'];assert len(wanted)==25;assert set(map(key,wanted))==set(tuple(r['key']) for r in data['key_rows'])==set(map(key,draft['reviews']));assert draft['status']=='proposal-not-reviewed'; assert len(data['graph'])==21
results=[]
for item in data['key_rows']:
 k=tuple(item['key']); rows=[r for r in ledger['symbol_uses'] if key(r)==k]; rr=[r for r in review['reviews'] if key(r)==k]; dr=[r for r in draft['reviews'] if key(r)==k];assert len(rows)==len(rr)==len(dr)==1; row,case,proposal=rows[0],rr[0],dr[0];assert row['source_review']['sha256']==data['frozen_review']['sha256'] and row['source_review']['path']==data['frozen_review']['path'];assert row['status']=='reviewed' and row['disposition']=='closed'; assert sha(json.dumps(case,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode())==item['historical_review']['record_sha256_canonical_json']; hist=item['historical_source'];blob=old(hist['git_commit'],hist['path']);assert sha(blob)==hist['sha256']==case['candidate_source_sha256'];assert git('rev-parse',f"{hist['git_commit']}:{hist['path']}").decode().strip()==hist['git_blob'];assert b'BidiModule' in blob; path=root/hist['path']; cur=root; absent=False
 for part in Path(hist['path']).parts:
  cur=cur/part
  try:s=cur.lstat()
  except FileNotFoundError:absent=True;break
  assert not stat.S_ISLNK(s.st_mode),str(cur)
 if item['proposed_status']=='retired-exact-source-path':assert absent and proposal['candidate_source_sha256'] is None and proposal['conclusion']=='removed-use'
 else:assert not absent and path.is_file() and sha(path.read_bytes())==hist['sha256'] and proposal['conclusion']=='stable-public-peer'
 for ref in case['independent_evidence']:
  actual=sha(read(ref['path'])); cmp=data['prior_evidence_physical_comparison'][ref['path']];assert cmp['expected_sha256']==ref['sha256'] and cmp['actual_sha256']==actual
 results.append({'key':k,'state':item['proposed_status'],'historical_source_sha256':hist['sha256'],'historical_blob':hist['git_blob'],'historical_review_case_sha256':item['historical_review']['record_sha256_canonical_json'],'ledger_row_sha256':sha(json.dumps(row,ensure_ascii=False,separators=(',',':')).encode())})
assert sum(x['state']=='retired-exact-source-path' for x in results)==23
for e in data['graph']:
 for typ in ['owner','public_api']:
  r=e[typ]; prev=old(r['old_commit'],r['path']); cur=read(r['path']);assert sha(prev)==r['old_sha256'] and sha(cur)==r['current_sha256']
  if typ=='owner':assert prev.count(b"import {MatCommonModule} from './internal/common-module';")==1;expected=prev.replace(b"import {MatCommonModule} from './internal/common-module';",b"import {MatLegacyCommonModule as MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';")
  else:assert prev.count(b"export {MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';\n")==1;expected=prev.replace(b"export {MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';\n",b'')
  assert cur==expected,r['path']
for entry in data['graph']:
 family=entry['family']; prefix='projects/ngx-material-legacy/'+family; paths=git('ls-tree','-r','--name-only',data['historical_base'],'--',prefix).decode().splitlines(); found=[p for p in paths if p.endswith('-module.ts') and b"from './internal/common-module'" in old(data['historical_base'],p)]; assert found==[entry['owner']['path']],(family,found)
for path in ['projects/ngx-material-legacy/legacy-core/internal/common-module.ts','projects/ngx-material-legacy/legacy-core/pseudo-checkbox/pseudo-checkbox-module.ts']:
 text=read(path).decode(); assert "import {BidiModule} from '@angular/cdk/bidi';" in text
 import re
 assert re.search(r'imports:\s*\[[^]]*\bBidiModule\b',text) and re.search(r'exports:\s*\[[^]]*\bBidiModule\b',text)
for r in data['other_public_barrels']:
 prev=old(r['old_commit'],r['path']);cur=read(r['path']);assert sha(prev)==r['old_sha256'] and sha(cur)==r['current_sha256'];expected=(prev.replace(b"\n/** Shared legacy NgModule. */\nexport {MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';\n",b'') if r['path'].endswith('src/public-api.ts') else prev.replace(b'export {MatCommonModule, MatCommonModule as MatLegacyCommonModule}',b'export {MatCommonModule as MatLegacyCommonModule}'));assert cur==expected
for r in data['physical_inputs']:
 b=read(r['path']);assert sha(b)==r['sha256'] and len(b)==r['bytes'],r['path']
for p,commit in [('tests/bidi_module_public_probe.mjs','e588978f3^'),('tests/test_bidi_module_public.py','646cc5ff7^')]:
 expected=data['prior_evidence_physical_comparison'][p]['expected_sha256'];actual=sha(old(commit,p));assert actual==expected,(p,actual,expected)
(root_out:=Path('/home/parallels/.codex/closeout-state/2026-11-07-recovery/frozen-public-bidi-retirement-independent-v1/rows.json')).write_text(json.dumps(results,indent=2)+'\n');print('PASS 25 exact seed/ledger/review/blob/physical paths; 23 missing 2 retained; 42 family and 2 root/core transitions; two historical producer bytes; all physical input pins')
