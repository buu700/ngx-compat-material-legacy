# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Authenticate every captured original source member against frozen-lock archive bytes."""
import base64
import hashlib
import io
import json
from pathlib import Path
import tarfile
import sys
ROOT=Path(__file__).resolve().parents[1]

def verify(identities_path,core_identity_path,core_source_path):
    lock_path=ROOT/'reference/material-16.2.14/environment-package-lock.json'
    lock_bytes=lock_path.read_bytes();lock=json.loads(lock_bytes)
    identities=json.loads(Path(identities_path).read_text());core=json.loads(Path(core_identity_path).read_text())
    if identities['lock_sha256']!=hashlib.sha256(lock_bytes).hexdigest():raise ValueError('original lock identity changed')
    if [r['package'] for r in identities['packages']]!=['@angular/material','@angular/cdk','@angular/forms']:raise ValueError('original package roster changed')
    if core['package']!='@angular/core':raise ValueError('original framework package identity changed')
    count=0
    for row in [*identities['packages'],core]:
        package=row['package'];expected=lock['packages']['node_modules/'+package];raw=Path(row['archive_path']).read_bytes()
        if row['integrity']!=expected['integrity']:raise ValueError('original SRI statement changed')
        algorithm,digest=expected['integrity'].split('-',1)
        if base64.b64encode(hashlib.new(algorithm,raw).digest()).decode()!=digest:raise ValueError('original archive SRI mismatch')
        archive_hash=row.get('tarball_sha256',row.get('archive_sha256'))
        if hashlib.sha256(raw).hexdigest()!=archive_hash:raise ValueError('original archive digest mismatch')
        with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as tf:
            manifest_bytes=tf.extractfile('package/package.json').read();manifest=json.loads(manifest_bytes)
            if manifest['name']!=package or manifest['version']!=expected['version'] or row['version']!=expected['version']:raise ValueError('original package identity changed')
            if package=='@angular/core':
                member=tf.extractfile('package/fesm2022/core.mjs').read()
                if Path(core_source_path).read_bytes()!=member or hashlib.sha256(member).hexdigest()!=row['member_sha256']:raise ValueError('original core source differs from archive')
                count+=1
                continue
            if Path(row['directory'],'package.json').read_bytes()!=manifest_bytes or hashlib.sha256(manifest_bytes).hexdigest()!=row['manifest_sha256']:raise ValueError('original manifest differs from archive')
            required=sorted(m.name.removeprefix('package/') for m in tf.getmembers() if m.isfile() and m.name.startswith('package/fesm2022/') and m.name.endswith('.mjs'))
            supplied=[m['path'] for m in row['members']]
            if len(set(supplied))!=len(supplied) or sorted(supplied)!=required:raise ValueError('original source member roster is incomplete/duplicated')
            for m in row['members']:
                relative=Path(m['path'])
                if relative.is_absolute() or '..' in relative.parts:raise ValueError('invalid original source member path')
                member=tf.extractfile('package/'+m['path']).read()
                if Path(row['directory'],m['path']).read_bytes()!=member:raise ValueError('original extracted bytes differ from archive')
                if hashlib.sha256(member).hexdigest()!=m['sha256'] or len(member)!=m['bytes']:raise ValueError('original extracted member identity changed')
                count+=1
    return {'archives':4,'members':count,'javascript_execution':False}

if __name__=='__main__':
    print(json.dumps(verify(*sys.argv[1:])))
