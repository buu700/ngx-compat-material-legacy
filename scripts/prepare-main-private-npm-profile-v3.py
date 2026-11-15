#!/usr/bin/env python3
"""Prepare main-only profile candidate. Source identity census; no security verdict."""
import argparse, hashlib, json, os, re, subprocess, sys
from pathlib import Path, PurePosixPath

RC='compatibility/rc/'
SUFFIXES=['.cjs','.js','.mjs','.py','.sh','.ts']
ROOTS=['tests','compatibility/handoff/codex-closeout/tools','compatibility/rc/typeahead-fixture','compatibility/rc/typeahead-runner']
CHECKER='scripts/check-dependency-eligibility.py'
CURRENT_NPM_ROSTER='compatibility/rc/npm-tooling-current-callers-v2.json'
CAP=3000000
SOURCE_CAP=4000000

def fail(msg): raise ValueError(msg)
def digest(b): return hashlib.sha256(b).hexdigest()
def canonical(v): return digest(json.dumps(v,sort_keys=True,separators=(',',':')).encode())
def pathcheck(s):
 if not isinstance(s,str) or not s or s.startswith('/') or any(x in ('','.','..') for x in s.split('/')): fail('unsafe path: '+repr(s))
 return s
def git(root,*args,input=None):
 env={k:v for k,v in os.environ.items() if k not in {'GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'}}
 env.update(GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1')
 p=subprocess.run(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',*args],cwd=root,input=input,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env)
 if p.returncode: fail('git failed: '+p.stderr.decode(errors='replace'))
 return p.stdout
def safe_bytes(root,name):
 return checked_bytes(root,name,CAP)
def source_bytes(root,name):
 return checked_bytes(root,name,SOURCE_CAP)
def checked_bytes(root,name,limit):
 pathcheck(name); p=root
 for part in name.split('/'):
  p=p/part
  if p.is_symlink(): fail('symlink: '+name)
 if not p.is_file(): fail('missing file: '+name)
 b=p.read_bytes()
 if not 0<len(b)<=limit: fail('invalid byte count: '+name)
 return b
def ref(root,name):
 b=safe_bytes(root,name); return {'path':name,'sha256':digest(b),'bytes':len(b)}
def verify_ref(root,r):
 if type(r)!=dict or set(r)!={'path','sha256','bytes'} or ref(root,r['path'])!=r: fail('reference mismatch: '+repr(r))
def load(root,name): return json.loads(safe_bytes(root,name))
def discover(root,directory,exts):
 parent=root/directory
 if parent.is_symlink() or not parent.is_dir(): fail('missing or linked discovery root: '+directory)
 found=set()
 for p in parent.rglob('*'):
  if p.is_symlink(): fail('symlink in discovery: '+str(p))
  if p.is_file() and p.suffix in exts: found.add(p.relative_to(root).as_posix())
 return found

def ignored_generated_reference(root,candidate,prefix):
 # The prefix allowlist is deliberately finite. Confirm the exact candidate
 # through Git ignore rules; pnpm's node_modules symlink prevents Git from
 # resolving descendants, so only that specific error permits a root check.
 if prefix not in ('dist/','node_modules/') or not candidate.startswith(prefix): return False
 p=subprocess.run(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','check-ignore','--no-index','-v','--',candidate],cwd=root,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 if p.returncode==0: return True
 if prefix=='node_modules/' and b'beyond a symbolic link' in p.stderr:
  q=subprocess.run(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','check-ignore','--no-index','-v','--','node_modules'],cwd=root,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
  return q.returncode==0
 return False

def require_new_target(root,tree,name):
 pathcheck(name); current=root
 for part in name.split('/'):
  current=current/part
  if current.is_symlink(): fail('candidate output target has symlink component: '+name)
 if name in tree or current.exists(): fail('candidate output target already exists: '+name)
 if not current.parent.is_dir(): fail('candidate output target parent is missing or not a directory: '+name)

def run(a):
 root=Path(a.root).resolve(strict=True); out=Path(a.out).resolve()
 if out==root or root in out.parents: fail('output must be outside worktree')
 if out.exists(): fail('output directory already exists')
 if not re.fullmatch('[0-9a-f]{40}',a.commit): fail('commit must be full SHA-1')
 if git(root,'rev-parse','HEAD').decode().strip()!=a.commit: fail('HEAD differs from frozen commit')
 if git(root,'status','--porcelain=v1','--untracked-files=no'): fail('tracked worktree or index is dirty')
 if a.profile_path!='compatibility/rc/parent-private-npm-current-profile-inputs-v3.json' or a.review_path!='compatibility/rc/parent-private-npm-current-profile-review-v3.json': fail('v3 profile/review targets must be fixed')
 tree={}
 for rec in git(root,'ls-tree','-r','-z',a.commit).split(b'\0'):
  if rec:
   meta,n=rec.split(b'\t',1); mode,kind,oid=meta.decode().split(); name=n.decode(); pathcheck(name)
   tree[name]=(mode,oid)
 profile=load(root,RC+'parent-private-npm-current-profile-inputs-v2.json')
 verify_ref(root,profile['review']); review=load(root,profile['review']['path'])
 old=load(root,RC+'tool-advisory-triage/private-profile-source-manifests.json')
 evidence=load(root,RC+'tool-advisory-triage/private-profile-remaining-evidence.json')
 brace=load(root,RC+'tool-advisory-triage/brace-profile-validation/manifest.json')['lines']['main']['source_inputs']
 if set(profile['lines'])!={'main','21.x'} or set(review['lines'])!={'main','21.x'}: fail('unexpected line population')
 primary=discover(root,'scripts',SUFFIXES)|discover(root,'.github/workflows',['.yml','.yaml'])
 primary.discard(CHECKER)
 primary.update(['.npmrc','chainman.toml','chainman.lock','justfile','package.json','projects/ngx-material-legacy/package.json','pnpm-lock.yaml'])
 previous=profile['lines']['main']
 git(root,'merge-base','--is-ancestor',previous['source_parent'],a.commit)
 retired=[dict(r) for r in previous['support_files'] if r['path'] not in tree]
 for row in retired:
  old_listing=git(root,'ls-tree','-z',previous['source_parent'],'--',row['path'])
  records=[x for x in old_listing.split(b'\0') if x]
  if len(records)!=1: fail('prior support path missing in historical tree: '+row['path'])
  meta,name=records[0].split(b'\t',1); mode,kind,oid=meta.decode().split()
  raw=git(root,'cat-file','blob',oid)
  if name.decode()!=row['path'] or mode not in ('100644','100755') or kind!='blob' or oid!=row['git_blob'] or digest(raw)!=row['sha256'] or len(raw)!=row['bytes']: fail('prior support row differs from Git: '+row['path'])
  if (root/row['path']).exists(): fail('retired support remains physically present: '+row['path'])
  history=git(root,'log','--format=%H',previous['source_parent']+'..'+a.commit,'--',row['path']).decode().splitlines()
  if not history: fail('retired support has no actual Git history: '+row['path'])
  row['commits']=history
 support={r['path'] for r in previous['support_files'] if r['path'] in tree}
 support.update({'compatibility/rc/typeahead-runner/historical-specs.json','testing/legacy-runner/historical-inventory.json','testing/legacy-runner/historical-specs.json'})
 groups=[]
 excluded_references=[]
 for directory in ROOTS:
  paths=discover(root,directory,SUFFIXES); support.update(paths)
  groups.append({'root':directory,'suffixes':SUFFIXES,'paths':sorted(paths)})
 # Recursively inspect relative literal imports/references to tracked files. This is
 # conservative finite discovery, not a proof that dynamic calls are absent.
 pending=list(primary|support); visited=set(); literals=re.compile(r'''["']((?:\.{1,2}/)[^"'\n\r]+)["']''')
 while pending:
  name=pending.pop()
  if name in visited: continue
  visited.add(name)
  if name not in tree: fail('untracked or missing relevant file: '+name)
  if Path(name).suffix not in SUFFIXES+['.json','.yaml','.yml']: continue
  try: content=source_bytes(root,name).decode('utf-8')
  except UnicodeDecodeError: continue
  for m in literals.finditer(content):
   value=m.group(1)
   if any(c in value for c in '*?${}'): continue
   resolved=os.path.normpath(os.path.join(os.path.dirname(name),value)).replace(os.sep,'/')
   if resolved.startswith('../') or resolved in ('.','..'): continue
   candidates=[resolved]+[resolved+x for x in SUFFIXES+['.json','.yaml','.yml']]+[resolved+'/index'+x for x in SUFFIXES]
   for candidate in candidates:
    if candidate not in tree and (root/candidate).is_file():
     prefix=next((p for p in ('dist/','node_modules/') if candidate.startswith(p)),None)
     if prefix is not None and ignored_generated_reference(root,candidate,prefix):
      excluded_references.append({'source':name,'candidate':candidate,'reason':'out-of-source generated/runtime input'})
      continue
     fail('untracked literal reference: '+candidate)
    if candidate in tree and candidate!=CHECKER and candidate not in primary and candidate not in support:
     support.add(candidate); pending.append(candidate)
 # Include previously bound finite inputs and independently enumerated sources.
 inputs=({r['path'] for r in profile['lines']['main']['input_files']}|{r['path'] for r in brace}|set(evidence['roots']['main']['source_hashes'])|{'toolchain-lock.json','.node-version','.npm-version','SECURITY.md',CURRENT_NPM_ROSTER})-primary-support
 if primary&support or CHECKER in primary|support|inputs: fail('overlapping rows or checker self-reference')
 # Reject untracked files inside both executable discovery roots, including ignored
 # files if their suffix would enter discovery; relevant names must be Git blobs.
 all_names=sorted(primary|support|inputs)
 for name in all_names:
  pathcheck(name)
  if name not in tree or tree[name][0] not in ('100644','100755'): fail('missing tracked regular blob: '+name)
 requests=''.join(tree[n][1]+'\n' for n in all_names).encode(); data=git(root,'cat-file','--batch',input=requests); pos=0; rows={}
 for name in all_names:
  end=data.index(b'\n',pos); oid,kind,size=data[pos:end].decode().split(); size=int(size)
  b=data[end+1:end+1+size]; pos=end+1+size+1
  if kind!='blob' or oid!=tree[name][1] or data[pos-1:pos]!=b'\n' or b!=source_bytes(root,name): fail('physical/blob mismatch: '+name)
  if hashlib.sha1(b'blob '+str(size).encode()+b'\0'+b).hexdigest()!=oid: fail('blob hash mismatch: '+name)
  rows[name]={'path':name,'sha256':digest(b),'bytes':size,'git_blob':oid}
 if pos!=len(data): fail('trailing git batch data')
 main={'source_parent':a.commit,'historical_source_parent':old['lines']['main']['source_parent'],'historical_source_files':len(old['lines']['main']['source_files']),'source_files':[rows[n] for n in sorted(primary)],'support_files':[rows[n] for n in sorted(support)],'input_files':[rows[n] for n in sorted(inputs)],'support_discovery':groups,'historical_source_hashes':{n:{'historical_sha256':d,'current_sha256':rows[n]['sha256']} for n,d in sorted(evidence['roots']['main']['source_hashes'].items())}}
 for name in all_names:
  if digest(source_bytes(root,name))!=rows[name]['sha256']: fail('late physical source change: '+name)
 if git(root,'rev-parse','HEAD').decode().strip()!=a.commit: fail('HEAD changed during census')
 if a.census_only:
  print(json.dumps({'status':'candidate census only; not semantic review','source_parent':a.commit,'prior_source_parent':previous['source_parent'],'source_files_sha256':canonical(main['source_files']),'support_files_sha256':canonical(main['support_files']),'input_files_sha256':canonical(main['input_files']),'counts':{'source':len(primary),'support':len(support),'inputs':len(inputs)},'retired_support':retired,'excluded_references':sorted(excluded_references,key=lambda x:(x['source'],x['candidate']))},indent=2)); return
 if not all([a.semantic_review,a.evidence_index,a.semantic_review_path,a.retired_review,a.retired_review_path]): fail('review inputs and targets required')
 targets={a.profile_path,a.review_path,a.semantic_review_path,a.retired_review_path}
 if len(targets)!=4: fail('candidate targets must be distinct')
 for target in targets:
  pathcheck(target)
  if not target.startswith('compatibility/rc/') or not target.endswith('.json') or target in all_names: fail('candidate target must be outside source populations')
  if any(target.startswith(g['root']+'/') and Path(target).suffix in SUFFIXES for g in groups): fail('candidate target enters discovery')
 document='compatibility/rc/historical-source-replay.md'
 for branch in profile['lines'].values():
  if any(r['path']==document for k in ('source_files','support_files','input_files') for r in branch[k]): fail('seal document in existing profile population')
  if any(document in g['paths'] or document.startswith(g['root']+'/') and Path(document).suffix in g['suffixes'] for g in branch['support_discovery']): fail('seal document in existing profile discovery')
 for name in (a.semantic_review,a.evidence_index,a.retired_review):
  external=Path(name).resolve(strict=True)
  if external==root or root in external.parents: fail('review input must be outside source root')
 # Semantic review is independently authored after B, outside the worktree.
 # It binds the candidate census exactly; evidence must already be committed in B.
 sem=json.loads(Path(a.semantic_review).read_bytes())
 old_refs=review.get('semantic_review_refs',[])
 extra=json.loads(Path(a.evidence_index).read_bytes())
 if type(extra)!=list: fail('evidence index must be a list of committed references')
 refs=old_refs+extra; seen=set()
 for item in refs:
  verify_ref(root,item); n=item['path']
  if n in seen: fail('duplicate semantic review: '+n)
  if n not in tree or tree[n][0] not in ('100644','100755'): fail('untracked semantic review: '+n)
  if n in all_names: fail('semantic review inside source projection: '+n)
  seen.add(n)
  if git(root,'cat-file','blob',tree[n][1])!=safe_bytes(root,n): fail('semantic review physical/blob mismatch: '+n)
 refs=sorted(refs,key=lambda x:x['path'])
 retirement=json.loads(Path(a.retired_review).read_bytes())
 expected_retirement={'schema_version':1,'role':'retired-current-support-review','line':'main','source_parent':a.commit,'prior_source_parent':previous['source_parent'],'retired':retired}
 if type(retirement)!=dict or set(retirement)!=set(expected_retirement)|{'evidence_refs'} or any(retirement.get(k)!=v for k,v in expected_retirement.items()): fail('retired support review does not bind exact Git histories')
 if type(retirement['evidence_refs'])!=list or not retirement['evidence_refs'] or any(r not in refs for r in retirement['evidence_refs']): fail('retired support review lacks committed evidence')
 retired_raw=(json.dumps(retirement,indent=2)+'\n').encode()
 require_new_target(root,tree,a.retired_review_path)
 retired_ref={'path':a.retired_review_path,'sha256':digest(retired_raw),'bytes':len(retired_raw)}
 if retired_ref['path'] in seen or retired_ref['path'] in all_names: fail('retired review target overlaps source')
 refs=sorted(refs+[retired_ref],key=lambda x:x['path'])
 expected={'schema_version':1,'role':'current-source-semantic-review','line':'main','preconditions':'unchanged-maintained-tool-owned-npm','source_parent':a.commit,**{n+'_sha256':canonical(main[n]) for n in ('source_files','support_files','input_files')}}
 if type(sem)!=dict or set(sem)!=set(expected)|{'evidence_refs'} or any(sem.get(k)!=v for k,v in expected.items()): fail('semantic review does not bind exact frozen source projection')
 if type(sem['evidence_refs'])!=list or not sem['evidence_refs'] or any(r not in refs for r in sem['evidence_refs']) or [r['path'] for r in sem['evidence_refs']]!=sorted(set(r['path'] for r in sem['evidence_refs'])) or retired_ref not in sem['evidence_refs']: fail('semantic evidence references invalid')
 semantic_raw=(json.dumps(sem,indent=2)+'\n').encode()
 require_new_target(root,tree,a.semantic_review_path)
 current={'path':a.semantic_review_path,'sha256':digest(semantic_raw),'bytes':len(semantic_raw)}
 if current['path'] in seen or current['path'] in all_names: fail('semantic review target overlaps committed source or evidence')
 refs=sorted(refs+[current],key=lambda x:x['path'])
 profile['lines']['main']=main
 review['lines']['main']={'source_parent':a.commit,'source_files_sha256':canonical(main['source_files']),'support_files_sha256':canonical(main['support_files']),'input_files_sha256':canonical(main['input_files']),'preconditions':'unchanged-maintained-tool-owned-npm'}
 profile['schema_version']=2
 review['semantic_review_refs']=refs
 review['current_source_reviews']={'main':current}
 review['method']=['Candidate finite source identity inventory; physical bytes compared to frozen Git blobs.','Relative literal tracked references recursively discovered; dynamic or computed references require independent semantic review.']
 review['limits']=['Census is not semantic or security clearance. Review references are separately authored and must be independently authenticated and assessed.']
 review_raw=(json.dumps(review,indent=2)+'\n').encode(); pathcheck(a.review_path); pathcheck(a.profile_path)
 if a.profile_path==a.review_path: fail('candidate profile and review targets must be distinct')
 require_new_target(root,tree,a.profile_path); require_new_target(root,tree,a.review_path)
 if len(review_raw)>CAP: fail('review exceeds cap')
 profile['review']={'path':a.review_path,'sha256':digest(review_raw),'bytes':len(review_raw)}
 profile_raw=(json.dumps(profile,indent=2)+'\n').encode()
 if len(profile_raw)>CAP: fail('profile exceeds cap')
 for name in all_names:
  if digest(source_bytes(root,name))!=rows[name]['sha256']: fail('late physical source change: '+name)
 for group in groups:
  if discover(root,group['root'],SUFFIXES)!=set(group['paths']): fail('late discovery change: '+group['root'])
 late_primary=discover(root,'scripts',SUFFIXES)|discover(root,'.github/workflows',['.yml','.yaml'])
 late_primary.discard(CHECKER); late_primary.update(['.npmrc','chainman.toml','chainman.lock','justfile','package.json','projects/ngx-material-legacy/package.json','pnpm-lock.yaml'])
 if late_primary!=primary: fail('late primary discovery change')
 for item in old_refs+extra: verify_ref(root,item)
 if git(root,'rev-parse','HEAD').decode().strip()!=a.commit: fail('HEAD changed before output')
 out.mkdir(parents=True,exist_ok=False)
 (out/'semantic-review.json').write_bytes(semantic_raw)
 (out/'retired-review.json').write_bytes(retired_raw)
 (out/'review.json').write_bytes(review_raw); (out/'profile.json').write_bytes(profile_raw)
 result={'status':'candidate only; no semantic or security clearance','commit':a.commit,'profile_target':a.profile_path,'profile_sha256':digest(profile_raw),'review_target':a.review_path,'review_sha256':digest(review_raw),'counts':{'source':len(primary),'support':len(support),'inputs':len(inputs)},'excluded_references':sorted(excluded_references,key=lambda x:(x['source'],x['candidate'])),'reviewed_source_checkpoint':a.commit,'checker_changes_required':['Commit reviewed candidate DATA before pinning the exact profile SHA256; semantic review must be independent.']}
 (out/'report.json').write_text(json.dumps(result,indent=2)+'\n'); print(json.dumps(result,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser(); p.add_argument('--root',required=True); p.add_argument('--commit',required=True); p.add_argument('--out',required=True); p.add_argument('--census-only',action='store_true'); p.add_argument('--semantic-review'); p.add_argument('--evidence-index'); p.add_argument('--semantic-review-path'); p.add_argument('--retired-review'); p.add_argument('--retired-review-path'); p.add_argument('--profile-path',required=True); p.add_argument('--review-path',required=True)
 try: run(p.parse_args())
 except Exception as e: print('ERROR: '+str(e),file=sys.stderr); sys.exit(1)
