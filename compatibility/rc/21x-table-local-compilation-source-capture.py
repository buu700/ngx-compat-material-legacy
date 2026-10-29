# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Cache-only full original Git data; no old program evaluation or cache writes."""
from pathlib import Path
import base64,gzip,hashlib,json,os,subprocess
ROOT=Path.cwd();PREFIX='compatibility/rc/21x-table-local-compilation-source-';MIRROR='/home/parallels/.cache/angular-components.git';SHA='3f35b12290ea4dbee4a9d82845c0964b2b4df50d';TAG='df60e733c60e572ba538f6ad0ceff3e63e527b53';H=lambda raw:hashlib.sha256(raw).hexdigest()
env={**os.environ,'GIT_NO_LAZY_FETCH':'1','GIT_NO_REPLACE_OBJECTS':'1','GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_GLOBAL':'/dev/null'}
for name in ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']:env.pop(name,None)
def git(*args):return subprocess.check_output(['git','--no-replace-objects','--git-dir='+MIRROR,'-c','gc.auto=0','-c','maintenance.auto=0',*args],env=env)
def oid(kind,raw):return hashlib.sha1((kind+' '+str(len(raw))+'\0').encode()+raw).hexdigest()
objects={}
def obj(kind,sha):
 raw=git('cat-file',kind,sha);assert oid(kind,raw)==sha
 objects.setdefault(kind,{})[sha]=raw;return raw
commits=[]
for sha in [SHA,TAG]:
 raw=obj('commit',sha);head=raw.decode().split('\n\n',1)[0].splitlines();commits.append({'sha':sha,'raw':raw.decode(),'sha256':H(raw),'tree':next(s[5:]for s in head if s.startswith('tree ')),'parents':[s[7:]for s in head if s.startswith('parent ')]})
parent=commits[0]['parents'][0];raw=obj('commit',parent);head=raw.decode().split('\n\n',1)[0].splitlines();commits.insert(1,{'sha':parent,'raw':raw.decode(),'sha256':H(raw),'tree':next(s[5:]for s in head if s.startswith('tree ')),'parents':[s[7:]for s in head if s.startswith('parent ')]})
def tree(sha):
 raw=obj('tree',sha);at=0;entries={}
 while at<len(raw):
  space=raw.index(b' ',at);end=raw.index(b'\0',space+1);entries[raw[space+1:end].decode()]={'mode':raw[at:space].decode(),'sha':raw[end+1:end+21].hex()};at=end+21
 return entries
def lookup(commit,path):
 current=commit['tree'];parts=path.split('/')
 for i,name in enumerate(parts):
  value=tree(current)[name]
  if i==len(parts)-1:return value
  assert value['mode']=='40000';current=value['sha']
def delta(before,after,prefix=''):
 if before==after:return[]
 a=tree(before)if before else{};b=tree(after)if after else{};out=[]
 for name in sorted(set(a)|set(b)):
  x,y=a.get(name),b.get(name)
  if x==y:continue
  path=prefix+name
  if (x and x['mode']=='40000')or(y and y['mode']=='40000'):
   assert not x or x['mode']=='40000';assert not y or y['mode']=='40000';out+=delta(x['sha']if x else None,y['sha']if y else None,path+'/')
  else:out.append({'path':path,'status':'M'if x and y else'A'if y else'D','before_mode':x['mode']if x else'000000','after_mode':y['mode']if y else'000000','before_blob':x['sha']if x else'0'*40,'after_blob':y['sha']if y else'0'*40})
 return out
changed=delta(commits[1]['tree'],commits[0]['tree']);assert len(changed)==2
census_path='compatibility/rc/upstream-complete-patch-census.json.gz';census_raw=(ROOT/census_path).read_bytes();assert H(census_raw)=='806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97';census=json.loads(gzip.decompress(census_raw));entry=next(row for row in census['commits']if row['sha']==SHA);assert changed==entry['complete_changed_files'];assert commits[0]['raw']==entry['raw_commit']
def member(commit,path):
 value=lookup(commit,path);assert value['mode']=='100644';raw=obj('blob',value['sha']);return{'path':path,'blob':value['sha'],'sha256':H(raw),'bytes':len(raw),'body':raw.decode()}
diff=git('diff','--no-ext-diff','--no-renames','--binary','--full-index',parent,SHA).decode();parts=diff.split('diff --git ')[1:];assert len(parts)==2
sections=[]
for row,part in zip(changed,parts):
 patch='diff --git '+part;assert patch.startswith('diff --git a/'+row['path']+' b/'+row['path']+'\n');hunks=__import__('re').split(r'(?=^@@ )',patch,flags=__import__('re').M)[1:]
 sections.append({**row,'before':member(commits[1],row['path']),'after':member(commits[0],row['path']),'patch':patch,'patch_sha256':H(patch.encode()),'hunks':[{'index':i+1,'header':h.split('\n')[0],'text':h,'sha256':H(h.encode())}for i,h in enumerate(hunks)]})
paths=['src/material/legacy-table/row.ts','src/material/legacy-table/table.ts','src/material/legacy-table/table-module.ts','src/material/legacy-table/cell.ts','src/material/legacy-table/table.scss','src/material/legacy-table/public-api.ts','src/cdk/table/row.ts','src/cdk/table/table.ts','src/cdk/table/table-module.ts','src/cdk/table/public-api.ts','tools/public_api_guard/material/legacy-table.md']
reference=[member(commits[2],path)for path in paths]
assert sum(len(s['hunks'])for s in sections)==7
packet={'schema_version':1,'line':'21.x','sha':SHA,'original_commit':commits[0],'parent_commit':commits[1],'tagged_reference':{'tag':'16.2.14','commit':commits[2],'members':reference},'complete_changed_files':changed,'sections':sections,'diff':diff,'diff_sha256':H(diff.encode()),'original_files':2,'original_hunks':7,'tree_objects':[{'sha':sha,'sha256':H(raw),'raw_base64':base64.b64encode(raw).decode()}for sha,raw in objects['tree'].items()],'capture_policy':{'existing_cache_only':True,'lazy_fetch':False,'Git_replace_objects':False,'shared_cache_modified':False,'network_fetches':0,'upstream_code_executed':False,'credentials_used':False},'canonical_decisions_changed':0,'product_changes':0,'actual_native_packed_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'}
p=ROOT/(PREFIX+'originals.json.gz')
with p.open('xb')as out:out.write(gzip.compress((json.dumps(packet,indent=2)+'\n').encode(),mtime=0))
print(json.dumps({'artifact':str(p.relative_to(ROOT)),'sha256':H(p.read_bytes()),'bytes':p.stat().st_size,'original_files':2,'original_hunks':7,'tagged_members':len(reference),'tree_objects':len(packet['tree_objects'])}))
