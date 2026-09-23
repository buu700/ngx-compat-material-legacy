#!/usr/bin/env python3
"""Create or verify an immutable SHA-256 seal for captured Material-16 reference evidence."""
from __future__ import annotations
import argparse,hashlib,json,os
from pathlib import Path

MANIFEST='.reference-seal.json'

def hash_file(p:Path)->str:
    h=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()

def collect(root:Path)->dict:
    if not root.is_dir(): raise ValueError('Reference root must be a directory')
    out={}
    for p in sorted(root.rglob('*')):
        if p.name==MANIFEST and p.parent==root:continue
        if p.is_symlink():raise ValueError(f'Symlinks are forbidden in sealed reference evidence: {p}')
        if p.is_file():out[p.relative_to(root).as_posix()]={'sha256':hash_file(p),'size':p.stat().st_size}
    if not out: raise ValueError('Refusing to seal empty reference evidence')
    return out

def create(root:Path)->dict:
    mf=root/MANIFEST
    if mf.exists():raise ValueError(f'Seal already exists: {mf}')
    files=collect(root)
    data={'schema_version':1,'algorithm':'sha256','files':files}
    mf.write_text(json.dumps(data,indent=2,sort_keys=True)+'\n')
    return {'ok':True,'mode':'create','file_count':len(files),'manifest':str(mf)}

def verify(root:Path)->dict:
    mf=root/MANIFEST
    if not mf.is_file():return {'ok':False,'mode':'verify','errors':['missing-seal'],'manifest':str(mf)}
    data=json.loads(mf.read_text())
    if data.get('schema_version')!=1 or data.get('algorithm')!='sha256':return {'ok':False,'mode':'verify','errors':['unsupported-seal-format'],'manifest':str(mf)}
    try:actual=collect(root)
    except ValueError as e:return {'ok':False,'mode':'verify','errors':[str(e)],'manifest':str(mf)}
    expected=data.get('files',{})
    errors=[]
    for name in sorted(set(expected)|set(actual)):
        if name not in expected:errors.append(f'unexpected:{name}')
        elif name not in actual:errors.append(f'missing:{name}')
        elif expected[name]!=actual[name]:errors.append(f'changed:{name}')
    return {'ok':not errors,'mode':'verify','errors':errors,'file_count':len(actual),'manifest':str(mf)}

def main():
    ap=argparse.ArgumentParser(description=__doc__);g=ap.add_mutually_exclusive_group(required=True);g.add_argument('--create',action='store_true');g.add_argument('--verify',action='store_true');ap.add_argument('root',type=Path)
    a=ap.parse_args();
    try:r=create(a.root) if a.create else verify(a.root)
    except ValueError as e:r={'ok':False,'mode':'create' if a.create else 'verify','errors':[str(e)]}
    print(json.dumps(r,indent=2,sort_keys=True))
    return 0 if r.get('ok') else 1
if __name__=='__main__':raise SystemExit(main())
