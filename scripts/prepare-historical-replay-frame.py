#!/usr/bin/env python3
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Inspect a committed, physically clean replay frame; never write a seal.

Run from the repository root after source freeze. Output is review material, not
qualification of changed product code or an authorization to update a registry.
"""
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys

OLD = '91674721699fb3706658ba325f57202e843f6a22'
ENV = {k: v for k, v in os.environ.items() if k not in {
    'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
    'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'}}
ENV.update(GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')

def git(*args, input=None):
    return subprocess.run(['git', '--no-replace-objects', '-c', 'gc.auto=0',
                           '-c', 'maintenance.auto=0', *args], input=input,
                          stdout=subprocess.PIPE, check=True, env=ENV).stdout

def inspect(root):
    root = Path(root).resolve(strict=True)
    if Path.cwd().resolve() != root:
        raise ValueError('run from the repository root')
    if git('status', '--porcelain=v1', '--untracked-files=no'):
        raise ValueError('tracked worktree or index is dirty')
    commit = git('rev-parse', '--verify', 'HEAD^{commit}').decode().strip()
    tree = git('rev-parse', commit + '^{tree}').decode().strip()
    listing = git('ls-tree', '-rz', commit)
    records = []
    for record in listing.split(b'\0'):
        if not record:
            continue
        meta, name = record.split(b'\t', 1)
        mode, kind, blob = meta.decode('ascii').split(' ')
        path = name.decode('utf-8')
        if mode not in ('100644', '100755') or kind != 'blob' or any(
                part in ('', '.', '..', '.git') for part in path.split('/')):
            raise ValueError('unsupported tree member: ' + path)
        records.append((path, mode, blob))
    if len({p for p, _, _ in records}) != len(records):
        raise ValueError('duplicate path')
    requested = b''.join((blob + '\n').encode() for _, _, blob in records)
    objects = git('cat-file', '--batch', input=requested)
    offset = 0
    sha = hashlib.sha256()
    physical_hashes = {}
    for path, mode, blob in records:
        end = objects.index(b'\n', offset)
        oid, kind, size = objects[offset:end].decode().split()
        size = int(size)
        raw = objects[end + 1:end + 1 + size]
        offset = end + 1 + size + 1
        if oid != blob or kind != 'blob' or objects[offset - 1:offset] != b'\n':
            raise ValueError('bad Git object: ' + path)
        cursor = root
        for part in path.split('/'):
            cursor = cursor / part
            if stat.S_ISLNK(cursor.lstat().st_mode):
                raise ValueError('symlink in physical route: ' + path)
        info = cursor.stat()
        if not stat.S_ISREG(info.st_mode) or bool(info.st_mode & 0o111) != (mode == '100755'):
            raise ValueError('physical type/mode differs: ' + path)
        if cursor.read_bytes() != raw:
            raise ValueError('physical bytes differ: ' + path)
        physical_hashes[path] = hashlib.sha256(raw).digest()
        sha.update((path + '\0' + mode + '\0' + blob + '\0').encode())
        sha.update(hashlib.sha256(raw).digest())
    if offset != len(objects):
        raise ValueError('unexpected Git batch data')
    product = root / 'projects/ngx-material-legacy'
    expected_product = [p for p, _, _ in records if p.startswith('projects/ngx-material-legacy/')]
    def check_product():
        physical_product = []
        for directory, dirs, files in os.walk(product, followlinks=False):
            dirs[:] = [name for name in dirs if name != 'node_modules']
            for name in dirs + files:
                child = Path(directory) / name
                if child.is_symlink():
                    raise ValueError('symlink in physical product: ' + str(child))
            physical_product.extend((Path(directory) / name).relative_to(root).as_posix() for name in files)
        if sorted(physical_product) != sorted(expected_product):
            raise ValueError('physical product membership differs')
    check_product()
    git('merge-base', '--is-ancestor', OLD, commit)
    diff = git('diff', '--no-renames', '--name-status', '-z', OLD, commit,
               '--', 'projects/ngx-material-legacy', 'compatibility/f10')
    # Closing sweep catches edits during the potentially long whole-tree pass.
    for path, mode, _ in records:
        cursor = root
        for part in path.split('/'):
            cursor = cursor / part
            if stat.S_ISLNK(cursor.lstat().st_mode):
                raise ValueError('late symlink: ' + path)
        info = cursor.stat()
        if (not stat.S_ISREG(info.st_mode) or
                bool(info.st_mode & 0o111) != (mode == '100755') or
                hashlib.sha256(cursor.read_bytes()).digest() != physical_hashes[path]):
            raise ValueError('late physical change: ' + path)
    check_product()
    if git('rev-parse', '--verify', 'HEAD^{commit}').decode().strip() != commit:
        raise ValueError('HEAD changed during inspection')
    changes = diff.rstrip(b'\0').split(b'\0') if diff else []
    if len(changes) % 2:
        raise ValueError('invalid name-status output')
    changed_paths = [{'status': changes[i].decode('ascii'), 'path': changes[i + 1].decode('utf-8')}
                     for i in range(0, len(changes), 2)]
    return {'commit': commit, 'tree': tree,
            'tree_listing_sha256': hashlib.sha256(listing).hexdigest(),
            'members': len(records), 'verified_content_sha256': sha.hexdigest(),
            'product_members': sum(p.startswith('projects/ngx-material-legacy/') for p, _, _ in records),
            'prior_frame': OLD, 'product_f10_diff_sha256': hashlib.sha256(diff).hexdigest(),
            'product_f10_changes': changed_paths,
            'qualification': 'identity inspection only; changed code requires independent review'}

if __name__ == '__main__':
    if len(sys.argv) != 1:
        raise SystemExit('usage: python3 scripts/prepare-historical-replay-frame.py')
    print(json.dumps(inspect(Path.cwd()), indent=2))
