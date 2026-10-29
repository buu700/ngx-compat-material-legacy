# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Capture one complete cached upstream commit as authenticated data only."""
from pathlib import Path,PurePosixPath
import base64,collections,gzip,hashlib,json,os,re,subprocess,zlib
ROOT=Path('/home/parallels/.codex/worktrees/codex-closeout-21/ngx-compat-material-legacy');MIRROR=Path('/home/parallels/.cache/angular-components.git');SHA='f7e3ae3bd1b86d5987df57bb06d350001c592931';TAG='df60e733c60e572ba538f6ad0ceff3e63e527b53';PREFIX='compatibility/rc/21x-legacy-removal-source-'
hash256=lambda raw:hashlib.sha256(raw).hexdigest()
def oid(kind,raw):return hashlib.sha1(f'{kind} {len(raw)}\0'.encode()+raw).hexdigest()
def ref(path):
 raw=(ROOT/path).read_bytes();return {'path':path,'sha256':hash256(raw),'bytes':len(raw)}
env={**os.environ,'GIT_NO_LAZY_FETCH':'1','GIT_NO_REPLACE_OBJECTS':'1'}
for key in ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']:env.pop(key,None)
command=['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','-c','remote.origin.promisor=false','-c','extensions.partialClone=','--git-dir='+str(MIRROR)]
census_raw=(ROOT/'compatibility/rc/upstream-complete-patch-census.json.gz').read_bytes();assert hash256(census_raw)=='806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97';census=json.loads(gzip.decompress(census_raw));row=next(x for x in census['commits']if x['sha']==SHA)
p=subprocess.Popen(command+['cat-file','--batch'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env);objects={};trees={}
def object_(sha,kind):
 if sha not in objects:
  p.stdin.write((sha+'\n').encode());p.stdin.flush();header=p.stdout.readline().decode().split();assert len(header)==3 and header[:2]==[sha,kind],('unavailable object',sha,kind,header)
  size=int(header[2]);assert 0<=size<=16*1024*1024;raw=p.stdout.read(size);assert len(raw)==size and p.stdout.read(1)==b'\n';assert oid(kind,raw)==sha;objects[sha]=(kind,raw)
 assert objects[sha][0]==kind;return objects[sha][1]
def commit(sha):
 raw=object_(sha,'commit');head=raw.decode().split('\n\n',1)[0].splitlines();tree=next(x[5:]for x in head if x.startswith('tree '));parents=[x[7:]for x in head if x.startswith('parent ')];return {'sha':sha,'tree':tree,'parents':parents,'raw_commit':raw.decode(),'sha256':hash256(raw)}
def tree_(sha):
 raw=object_(sha,'tree');entries={};at=0
 while at<len(raw):
  space=raw.index(b' ',at);zero=raw.index(b'\0',space);mode=raw[at:space].decode();name=raw[space+1:zero].decode();child=raw[zero+1:zero+21].hex();assert len(child)==40 and name not in entries and name not in['','.','..']and '/'not in name
  entries[name]={'mode':mode,'sha':child};at=zero+21
 assert at==len(raw);trees[sha]={'sha':sha,'raw_base64':base64.b64encode(raw).decode(),'sha256':hash256(raw)};return entries
def lookup(c,path):
 parts=path.split('/');assert all(x not in['','.','..']for x in parts);tree=c['tree']
 for index,name in enumerate(parts):
  entries=tree_(tree)
  if name not in entries:return None
  item=entries[name]
  if index==len(parts)-1:return item
  if item['mode']!='40000':return None
  tree=item['sha']
def member(c,path,expected=None):
 entry=lookup(c,path)
 if expected=='0'*40:
  assert entry is None;return {'path':path,'blob':expected,'sha256':hash256(b''),'bytes':0,'absent':True,'encoding':'utf8','body':''}
 assert entry and entry['mode']=='100644';blob=entry['sha'];assert expected is None or blob==expected;raw=object_(blob,'blob')
 if path.endswith('.png'):
  assert path=='src/material/legacy-tabs/Tabs Pagination.png' and raw.startswith(b'\x89PNG\r\n\x1a\n');encoding='base64';body=base64.b64encode(raw).decode()
 else:encoding='utf8';body=raw.decode();assert b'\0'not in raw
 return {'path':path,'blob':blob,'sha256':hash256(raw),'bytes':len(raw),'encoding':encoding,'body':body}
def binary_literals(text):
 blocks=re.findall(r'literal (\d+)\n((?:[^\n]+\n)+)\n',text);assert len(blocks)==2;result=[]
 for size,lines in blocks:
  compressed=b''
  for line in lines.splitlines():
   count=ord(line[0])-ord('A')+1 if 'A'<=line[0]<='Z'else ord(line[0])-ord('a')+27
   assert 1<=count<=52 and len(line[1:])==((count+3)//4)*5;decoded=base64.b85decode(line[1:]);assert not any(decoded[count:]);compressed+=decoded[:count]
  raw=zlib.decompress(compressed);assert len(raw)==int(size);result.append(raw)
 return result
try:
 target=commit(SHA);parent=commit(row['parents'][0]);tag=commit(TAG);assert target['tree']==row['tree']and target['parents']==row['parents']and target['raw_commit']==row['raw_commit']
 patch=subprocess.check_output(command+['show','--format=','--no-color','--no-ext-diff','--no-textconv','--no-renames','--full-index','--binary',SHA],env=env).decode();parts=re.split(r'(?=^diff --git )',patch,flags=re.M)[1:];assert len(parts)==746==len(row['complete_changed_files']);sections=[]
 for original,text in zip(row['complete_changed_files'],parts):
  path=original['path'];assert text.startswith('diff --git a/'+path+' b/'+path+'\n');before=member(parent,path,original['before_blob']);after=member(target,path,original['after_blob']);hunks=re.split(r'(?=^@@ )',text,flags=re.M)[1:]
  section={**original,'before':before,'after':after,'patch':text,'patch_sha256':hash256(text.encode()),'hunks':[{'index':index+1,'header':h.splitlines()[0],'text':h,'sha256':hash256(h.encode())}for index,h in enumerate(hunks)]}
  if path.endswith('.png'):
   assert original['status']=='D'and not hunks and 'GIT binary patch\n'in text;forward,reverse=binary_literals(text);assert forward==b''and reverse==base64.b64decode(before['body']);section['binary_literal_reconstruction']={'forward_bytes':0,'reverse_bytes':len(reverse),'reverse_sha256':hash256(reverse)}
  elif not hunks:
   assert original['status']=='D'and before['bytes']==0 and after['absent'];section['empty_text_deletion']=True
  sections.append(section)
 # Use the untouched16tag,including its own primary/testing API and API goldens.
 listing=subprocess.check_output(command+['ls-tree','-r','--name-only',TAG,'--','src/material','tools/public_api_guard/material'],env=env,text=True).splitlines();available=set(listing)
 tag_paths={path for path in available if '/legacy-'in path and(path.endswith('/public-api.ts')or(path.startswith('tools/public_api_guard/material/legacy-')and path.endswith('.md')))};tag_paths.update(['src/material/_index.scss','src/material/package-base.json'])
 tag_index=member(tag,'src/material/_index.scss')['body']
 for module in re.findall(r"@forward ['\"](\./legacy-[^'\"]+)['\"]",tag_index):
  value=PurePosixPath('src/material')/module[2:];candidates=[str(value)+'.scss',str(value.parent/('_'+value.name+'.scss')),str(value/'_index.scss')];found=[path for path in candidates if path in available];assert len(found)==1,(module,found);tag_paths.add(found[0])
 assert 80<=len(tag_paths)<=160
 tagged=[member(tag,path)for path in sorted(tag_paths)]
 worksheet_path=ROOT/(PREFIX+'worksheet.json');worksheet=json.loads(worksheet_path.read_bytes());worksheet.update(selected_sha_ids=[SHA],original_file_occurrences=746,expected_status_occurrences={'M':44,'D':702},tag_source_paths=sorted(tag_paths),capture_format='Regular UTF8 text plus exactly one authenticated deleted PNG;both Git binary literals independently inflated',artifact_prefix=PREFIX)
 worksheet_path.write_text(json.dumps(worksheet,indent=2)+'\n')
 capsule={'schema_version':1,'line':'21.x','role':'Complete original source/context acquisition only;not a disposition or runtime pass','source_census':ref('compatibility/rc/upstream-complete-patch-census.json.gz'),'worksheet_at_capture':worksheet,'original_commit':target,'parent_commit':parent,'tagged_reference':{'tag':'16.2.14','commit':tag,'members':tagged},'diff':patch,'diff_sha256':hash256(patch.encode()),'sections':sections,'tree_objects':list(trees.values()),'original_files':len(sections),'original_text_hunks':sum(len(x['hunks'])for x in sections),'binary_deletion_sections':sum('binary_literal_reconstruction'in x for x in sections),'status_occurrences':dict(collections.Counter(x['status']for x in sections)),'capture_policy':{'existing_cache_only':True,'lazy_fetch':False,'Git_replace_objects':False,'shared_cache_modified':False,'network_fetches':0,'upstream_code_executed':False,'credentials_used':False},'canonical_decisions_changed':0,'product_changes':0,'actual_native_packed_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'}
 out=ROOT/(PREFIX+'originals.json.gz');encoded=gzip.compress((json.dumps(capsule,indent=2)+'\n').encode(),mtime=0)
 with out.open('xb')as output:output.write(encoded)
 print(json.dumps({'path':str(out.relative_to(ROOT)),'sha256':hash256(encoded),'bytes':len(encoded),'files':len(sections),'text_hunks':capsule['original_text_hunks'],'binary_deletions':capsule['binary_deletion_sections'],'tagged_members':len(tagged),'tree_objects':len(trees),'network_fetches':0}))
finally:
 p.stdin.close();p.wait(timeout=10);assert p.returncode==0,p.stderr.read().decode()
