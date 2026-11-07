# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact current main graph transitions; source identity only."""
import copy,hashlib,json,os,subprocess
from pathlib import Path
PACKET='compatibility/rc/parent-main-sass-domain-source-successor-v1.json'
PIN='7b58ac738ab37f636daf1b7a1212a59dcb81f658263b993e6c9a0eed13308a9f'
PATHS=['projects/ngx-material-legacy/legacy-form-field/form-field.html','projects/ngx-material-legacy/legacy-form-field/form-field.scss','projects/ngx-material-legacy/legacy-menu/menu.scss','projects/ngx-material-legacy/legacy-progress-spinner/internal/common-module.ts','projects/ngx-material-legacy/legacy-progress-spinner/progress-spinner-module.ts','projects/ngx-material-legacy/legacy-progress-spinner/public-api.ts','projects/ngx-material-legacy/legacy-snack-bar/internal/common-module.ts','projects/ngx-material-legacy/legacy-snack-bar/snack-bar-module.ts','projects/ngx-material-legacy/legacy-snack-bar/public-api.ts','projects/ngx-material-legacy/legacy-menu/public-api.ts']
SUPPORT=['projects/ngx-material-legacy/legacy-core/internal/common-module.ts','projects/ngx-material-legacy/legacy-core/public-api.ts','compatibility/rc/parent-main-common-module-integration-review-v1.json','compatibility/rc/parent-main-form-field-dom-motion-integration-review-v1.json','compatibility/rc/parent-main-menu-empty-motion-integration-review-v1.json','compatibility/rc/parent-main-menu-six-export-repair-v1.json']
def sha(b):return hashlib.sha256(b).hexdigest()
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def physical(root,path):
 assert type(path) is str and path and all(x not in ('','.','..') for x in path.split('/')) and not path.startswith('/') and '\\' not in path
 p=root
 for part in path.split('/'):
  p=p/part;assert not p.is_symlink()
 assert p.is_file();return p.read_bytes()
def ref(path,b):return dict(path=path,sha256=sha(b),bytes=len(b),git_blob=blob(b))
class MainSassGraphSuccessor:
 __slots__=('_root','_read','_bound','_removed','_transitions','_surface','_active','_nested')
 def __init__(self,root,read):
  if not __debug__:raise RuntimeError('optimized Python cannot authenticate Sass graph')
  self._root=Path(root).absolute();assert self._root.is_dir() and not self._root.is_symlink(),'invalid graph root';self._read=read;self._bound={};self._removed=[];self._active=False;self._nested=False
  raw=physical(self._root,PACKET);assert (sha(raw),len(raw))==(PIN,17886);p=json.loads(raw)
  assert p['schema_version']==1 and p['role']=='finite-current-main-sass-graph-source-successor' and p['line']=='main' and p['source_scope_only'] is True and p['historical_programs_executed'] is False and p['canonical_admission_granted'] is False and p['g11_claim']=='not-passed'
  assert p['before_commit']=='8baa761eca624c9d71293c3d31750a2b3fdeebf0' and p['after_commit']=='8f9f724615ede1b0af0e2c4c347449c5952710e5'
  assert [x['path'] for x in p['transitions']]==PATHS and [x['path'] for x in p['support']]==SUPPORT
  env={k:v for k,v in os.environ.items() if not k.startswith('GIT_')};env.update(GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1',GIT_TERMINAL_PROMPT='0',GIT_CONFIG_GLOBAL='/dev/null',GIT_CONFIG_SYSTEM='/dev/null')
  def git(*args):return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',*args],cwd=self._root,env=env)
  git('merge-base','--is-ancestor',p['before_commit'],p['after_commit']);git('merge-base','--is-ancestor',p['after_commit'],'HEAD')
  surface_path='compatibility/rc/parent-main-sass-common-surface-source-v1.json';surface_raw=physical(self._root,surface_path);assert (sha(surface_raw),len(surface_raw))==('423dda43fd2b090f3fcc260b6a2cdc41a2fcdbfe3553b67178700411c7f5b02c',36437);sp=json.loads(surface_raw)
  assert sp['schema_version']==1 and sp['role']=='main-sass-common-module-surface-source-successor' and sp['line']=='main' and sp['source_scope_only'] is True and sp['historical_programs_executed'] is False and sp['canonical_admission_granted'] is False and sp['g11_claim']=='not-passed'
  assert sp['base_commit']==p['after_commit'] and sp['parent_commit']=='a98b0a91011a00887462a89011516f39b3bf663f' and sp['source_commit']=='fdcdadee28c4552e3500b5099de9f42e456adb5c' and sp['modules']==sp['family_barrels']==21 and len(sp['transitions'])==44
  assert git('rev-parse',sp['source_commit']+'^').decode().strip()==sp['parent_commit'];git('merge-base','--is-ancestor',sp['base_commit'],sp['parent_commit']);git('merge-base','--is-ancestor',sp['source_commit'],'HEAD')
  changed=git('diff-tree','--no-commit-id','--name-only','-r',sp['source_commit'],'--','projects/ngx-material-legacy').decode().splitlines();assert [r['path'] for r in sp['transitions']]==changed
  assert sp['review']['path']=='compatibility/rc/parent-main-common-module-surface-review-v1.json' and sp['review']['sha256']=='54b03be88958c17a3dc7653b4e9ad4fef0fe4dac653fbf6b3f0317c7fd9fc6e6';review=git('show',sp['source_commit']+':'+sp['review']['path']);assert ref(sp['review']['path'],review)==sp['review']
  self._surface={};modules=barrels=0
  for row in sp['transitions']:
   path=row['path'];before=git('show',sp['parent_commit']+':'+path);base=git('show',sp['base_commit']+':'+path);after=git('show',sp['source_commit']+':'+path)
   assert before==base and ref(path,before)==row['before'] and ref(path,after)==row['after'];at=0;parts=[]
   for e in row['edits']:
    assert set(e)=={'offset','before','after'} and type(e['offset']) is int and at<=e['offset']<=len(before);old=e['before'].encode();assert before[e['offset']:e['offset']+len(old)]==old;parts.extend((before[at:e['offset']],e['after'].encode()));at=e['offset']+len(old)
   assert b''.join(parts)+before[at:]==after;a=before.decode();b=after.decode()
   if path.endswith('-module.ts'):
    old_text="import {MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';";new_text="import {MatLegacyCommonModule as MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';";modules+=1
   elif path.endswith('/public-api.ts') and '/legacy-core/' not in path and '/src/' not in path:
    old_text="export {MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';\n";new_text='';barrels+=1
   elif path.endswith('/legacy-core/public-api.ts'):
    old_text="export {MatCommonModule, MatCommonModule as MatLegacyCommonModule} from './internal/common-module';";new_text="export {MatCommonModule as MatLegacyCommonModule} from './internal/common-module';"
   elif path.endswith('/src/public-api.ts'):
    old_text="\n/** Shared legacy NgModule. */\nexport {MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';\n";new_text=''
   else:raise AssertionError('unexpected common-module surface path')
   assert a.count(old_text)==1 and a.replace(old_text,new_text)==b;self._surface[path]=(row,after)
  assert modules==barrels==21
  def add(path,b):
   item=self._surface.get(path)
   if item and sha(b)==item[0]['before']['sha256']:
    assert ref(path,b)==item[0]['before'];b=item[1]
   assert physical(self._root,path)==b
   if read is not None:
    supplied=read(path);assert type(supplied) is bytes and supplied==b
   assert physical(self._root,path)==b
   self._bound[path]=dict(path=path,sha256=sha(b),bytes=len(b))
  add(PACKET,raw);add(surface_path,surface_raw);add(sp['review']['path'],review);self._transitions={}
  for row in p['transitions']:
   path=row['path'];before=git('show',p['before_commit']+':'+path);assert ref(path,before)==row['before']
   if row['after'] is None:
    assert not row['edits'] and not git('ls-tree','-z',p['after_commit'],'--',path);assert not (self._root/path).exists() and not (self._root/path).is_symlink();self._removed.append(path)
   else:
    after=git('show',p['after_commit']+':'+path);assert ref(path,after)==row['after'];cursor=0;parts=[]
    for e in row['edits']:
     assert set(e)=={'offset','before','after'} and type(e['offset']) is int and cursor<=e['offset']<=len(before);old=e['before'].encode();assert before[e['offset']:e['offset']+len(old)]==old;parts.extend((before[cursor:e['offset']],e['after'].encode()));cursor=e['offset']+len(old)
    assert b''.join(parts)+before[cursor:]==after;add(path,after)
   self._transitions[path]=row
  for item in p['support']:
   data=git('show',p['after_commit']+':'+item['path']);assert ref(item['path'],data)==item;add(item['path'],data)
  for path,(_,after) in self._surface.items():add(path,after)
  core=physical(self._root,SUPPORT[0]).decode();barrel=physical(self._root,SUPPORT[1]).decode();assert 'imports: [BidiModule, A11yModule]' in core and 'exports: [BidiModule]' in core and 'export class MatCommonModule' in core and "export {MatCommonModule as MatLegacyCommonModule} from './internal/common-module';" in barrel
  for path in (PATHS[4],PATHS[7]):assert "import {MatLegacyCommonModule as MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';" in physical(self._root,path).decode()
  for path in (PATHS[5],PATHS[8]):assert "export {MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';" not in physical(self._root,path).decode()
  self.assert_current()
 @property
 def bound(self):return copy.deepcopy(self._bound)
 @property
 def removed(self):return tuple(self._removed)
 def _idle(self):
  if self._active:self._nested=True;raise AssertionError('reentrant graph successor')
 def _sweep(self):
  for path,row in self._bound.items():
   raw=physical(self._root,path);assert sha(raw)==row['sha256'] and len(raw)==row['bytes']
  for path in self._removed:assert not (self._root/path).exists() and not (self._root/path).is_symlink()
 def assert_physical(self):self._idle();self._sweep()
 def assert_current(self):
  self._idle();self._active=True;self._nested=False
  try:
   self._sweep()
   if self._read is not None:
    for path in self._bound:
     raw=physical(self._root,path);supplied=self._read(path);assert type(supplied) is bytes and supplied==raw and physical(self._root,path)==raw
   assert not self._nested;self._sweep()
  finally:self._active=False
 def qualify(self,row):
  self._idle();r=self._transitions.get(row['path']);item=self._surface.get(row['path']);n=item[0] if item else None
  if r is None and n is None:return None
  candidates=([r['before'],r['after']] if r else [])+([n['before'],n['after']] if n else [])
  chosen=next((x for x in candidates if x and x['sha256']==row['sha256']),None);assert chosen is not None and row.get('bytes',chosen['bytes'])==chosen['bytes']
  after=n['after'] if n else r['after']
  return None if after is None else {k:after[k] for k in ('path','sha256','bytes')}
