import json,pathlib,hashlib,subprocess
R=pathlib.Path('/home/parallels/.codex/closeout-state/2026-11-14-resume/motion72-review-worktree');O=R.parent/'motion72-source-review-v1';h=lambda b:hashlib.sha256(b).hexdigest();load=lambda p:json.loads(p.read_text());git=lambda *a:subprocess.check_output(['git','--no-replace-objects',*a],cwd=R,stderr=subprocess.DEVNULL);rows=load(R/'compatibility/f10/authored-dependency-dispositions.json')['symbol_uses'];key=lambda x:(x['file'],x['module'],x['symbol']);index={key(x):x for x in rows};census=load(O/'docs/census.json');selected={key(x['key']) for x in census['entries'] if not x.get('hold') and x['occurrences_equal'] and not x['member_changes']};head=git('rev-parse','HEAD').decode().strip();out=[];cache={}
for e in census['entries']:
 k=key(e['key']);
 if k in selected:continue
 if k[2]=='CSP_NONCE':out.append({'key':e['key'],'hold':'Security scope excluded; no security review or clearance.'});continue
 old=index[k];data=(R/old['source_review']['path']).read_bytes();assert h(data)==old['source_review']['sha256'];review=next(x for x in json.loads(data)['reviews'] if key(x)==k);src='projects/ngx-material-legacy/'+k[0];target=review['candidate_source_sha256'];cachekey=(src,target)
 if cachekey not in cache:
  before=None
  for c in git('log','--format=%H','--',src).decode().splitlines():
   try:raw=git('show',c+':'+src)
   except subprocess.CalledProcessError:continue
   if h(raw)==target:before=c;break
  if before is None:cache[cachekey]={'status':'historical source hash not found; held','expected_sha256':target}
  else:cache[cachekey]={'before_commit':before,'before_sha256':target,'current_commit':head,'current_sha256':h((R/src).read_bytes()),'commits':git('log','--format=%H',before+'..'+head,'--',src).decode().splitlines(),'full_diff':git('diff','--no-ext-diff',before,head,'--',src).decode()}
 ev=[]
 for z in review['independent_evidence']:
  p=R/z['path'];current=h(p.read_bytes()) if p.is_file() else None;ev.append({'path':z['path'],'recorded_sha256':z['sha256'],'current_sha256':current,'matches':current==z['sha256']})
 out.append({'key':e['key'],'hold':e.get('hold') or ('direct expression changed, including token or key behavior' if not e['occurrences_equal'] else 'complete member changed; behavior requires individual evidence'),'prior_complete_row':old,'prior_complete_review':review,'source_transition':cache[cachekey],'evidence_hash_inventory':ev,'role_comparison':{z:e[z] for z in ['prior','current','occurrences_equal','prior_complete_members','current_complete_members','member_changes'] if z in e}})
assert len(out)==62;doc={'schema_version':1,'line':'main','base_head':head,'status':'held-no-admission','entries':out,'scope':'Exact prior review/source provenance and identified unresolved roles. Recorded prior API evidence is historical; no fresh identity, behavior, security, or G11 pass is implied.'};(O/'held-audit.json').write_text(json.dumps(doc,indent=2)+'\n');print('held',len(out),'no matched preimage',sum(x.get('source_transition',{}).get('status') is not None for x in out))
