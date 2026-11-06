# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Authenticate a finite owned source successor; no historical source reads are exposed."""
import hashlib
import json
import os
from pathlib import Path
import subprocess

PACKETS = [
    ('compatibility/rc/parent-select-dialog-finite-source-v1.json','fe029afba0dbf7b1d9ecf51661cdc98240b6b0c2ee70a352dfdf99fd48ce27a6',17132),
    ('compatibility/rc/parent-select-dialog-menu-finite-source-v2.json','67f279d9631a48a4cf69ef41c3ae4c3ab3446bca457d023b7e22e323506c6d88',34319),
    ('compatibility/rc/parent-select-dialog-menu-snack-finite-source-v3.json','bb2be03706f10cc22029facdb916d3527bf40cef120f0746d4ddd8794371159d',49370),
]
PATHS = [
 'projects/ngx-material-legacy/legacy-select/select.html',
 'projects/ngx-material-legacy/legacy-select/select.spec.ts',
 'projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.ts',
 'projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts',
 'projects/ngx-material-legacy/legacy-menu/menu.spec.ts',
 'projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.ts',
 'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-base.ts',
 'projects/ngx-material-legacy/legacy-snack-bar/snack-bar.spec.ts',
]
def sha(raw): return hashlib.sha256(raw).hexdigest()
def need(ok, message):
    if not ok: raise ValueError(message)
def physical(root, path):
    need(isinstance(path,str) and not path.startswith('/') and '\\' not in path, 'invalid product path')
    cur = Path(root)
    for part in path.split('/'):
        need(part not in ('','.','..'), 'invalid product path');cur = cur / part
        need(not cur.is_symlink(), 'symlink product input: '+path)
    need(cur.is_file(), 'missing product input: '+path)
    return cur.read_bytes()
def make_finite_product_successor(root):
    root=Path(root).resolve(); version=json.loads(physical(root,'projects/ngx-material-legacy/package.json'))['version']
    line='21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None
    need(line is not None,'wrong product line'); packets=[]; bound=[]
    for path,digest,size in PACKETS:
        raw=physical(root,path);need(len(raw)==size and sha(raw)==digest,'changed product packet: '+path);packets.append(json.loads(raw));bound.append((path,digest,size))
    old,mid,new=packets
    need(old['schema_version']==mid['schema_version']==new['schema_version']==1, 'wrong product packet schema')
    need(old['role']=='finite-select-dialog-current-source-successor' and mid['role']=='finite-select-dialog-menu-current-source-successor' and new['role']=='finite-select-dialog-menu-snack-current-source-successor','wrong product packet roles')
    for i,packet in enumerate((mid,new),start=1):
        path,digest,size=PACKETS[i-1];need(packet['previous_packet']=={'path':path,'sha256':digest,'bytes':size},'changed predecessor packet')
    rows=new['branches'][line]['transitions'];need([r['path'] for r in rows]==PATHS,'changed finite product path set')
    need(rows[:3]==old['branches'][line]['transitions'] and rows[:5]==mid['branches'][line]['transitions'],'changed previous product transforms')
    env={k:v for k,v in os.environ.items() if not k.startswith('GIT_')};env.update(GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1',GIT_TERMINAL_PROMPT='0')
    for row in rows:
        path=row['path'];parent=row['source_parent'];need(len(parent)==40 and all(c in '0123456789abcdef' for c in parent),'bad source parent')
        before=subprocess.run(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],cwd=root,env=env,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE).stdout
        b=row['before'];a=row['after'];need(b['path']==a['path']==path and len(before)==b['bytes'] and sha(before)==b['sha256'],'bad product preimage')
        need(hashlib.sha1(b'blob '+str(len(before)).encode()+b'\0'+before).hexdigest()==b['git_blob'],'bad product blob')
        chunks=[];cursor=0
        for edit in row['edits']:
            need(set(edit)=={'offset','before','after'},'bad edit');offset=edit['offset'];oldbytes=edit['before'].encode();need(type(offset) is int and offset>=cursor and before[offset:offset+len(oldbytes)]==oldbytes,'bad finite product edit');chunks.extend((before[cursor:offset],edit['after'].encode()));cursor=offset+len(oldbytes)
        derived=b''.join(chunks)+before[cursor:];need(len(derived)==a['bytes'] and sha(derived)==a['sha256'],'bad product afterimage');need(hashlib.sha1(b'blob '+str(len(derived)).encode()+b'\0'+derived).hexdigest()==a['git_blob'],'bad product after blob')
        need(physical(root,path)==derived,'changed current product: '+path);bound.append((path,a['sha256'],a['bytes']))
    def sweep():
        for path,digest,size in bound:
            raw=physical(root,path);need(len(raw)==size and sha(raw)==digest,'changed finite product input: '+path)
    def qualify(path,digest):
        row=next((r for r in rows if r['path']==path),None)
        if row is None:return digest
        need(digest in (row['before']['sha256'],row['after']['sha256']),'unknown product predecessor: '+path)
        sweep();return row['after']['sha256']
    sweep();return qualify,sweep
