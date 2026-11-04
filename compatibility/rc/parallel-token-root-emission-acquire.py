#!/usr/bin/env python3
# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Authenticate two complete original patches and their tagged Sass context."""
import difflib
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
PREFIX = ROOT / 'compatibility/rc/parallel-token-root-emission-'
CACHE = '/home/parallels/.cache/angular-components.git'
TAG = 'df60e733c60e572ba538f6ad0ceff3e63e527b53'
SUBJECTS = [
 ('spinner', 'f8252d816806b4fff18bb5f7d313a8edca774459', 'dfba0edfbec52614e42e6fe0f9409a1fa0346669', 'src/material/progress-spinner/_progress-spinner-theme.scss'),
 ('snack', '6c724c713fb0510b32ce302a51f1d9d15df4b668', 'b3e4d576b9f0060bb1110766d74c982e4620b2a6', 'src/material/snack-bar/_snack-bar-theme.scss'),
]
def digest(raw):
    return hashlib.sha256(raw).hexdigest()
def obj(kind, raw):
    return hashlib.sha1(f'{kind} {len(raw)}\0'.encode() + raw).hexdigest()
def git(*args, check=True):
    env = {key: value for key, value in os.environ.items() if not key.startswith('GIT_')}
    env.update(GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1')
    return subprocess.run(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c',
        'maintenance.auto=0', '-c', 'remote.origin.promisor=false', '-c', 'extensions.partialClone=',
        '--git-dir=' + CACHE, *args], capture_output=True, env=env, check=check, timeout=30)
commits = {}
def commit(revision):
    if revision not in commits:
        raw = git('cat-file', 'commit', revision).stdout
        assert obj('commit', raw) == revision
        commits[revision] = {'raw_commit': raw.decode(), 'sha256': digest(raw)}
    return commits[revision]['raw_commit']
def path_identity(revision, path):
    tree = commit(revision).splitlines()[0].split()[1]
    chain = []
    for index, part in enumerate(path.split('/')):
        raw = git('cat-file', 'tree', tree).stdout
        assert obj('tree', raw) == tree
        entries, at = {}, 0
        while at < len(raw):
            end = raw.index(b'\0', at)
            mode, name = raw[at:end].split(b' ', 1)
            entries[name.decode()] = (mode.decode(), raw[end + 1:end + 21].hex())
            at = end + 21
        mode, selected = entries[part]
        chain.append({'tree': tree, 'sha256': digest(raw), 'name': part, 'mode': mode, 'selected': selected})
        if index + 1 < len(path.split('/')):
            assert mode == '40000'
            tree = selected
    assert mode == '100644'
    return selected, chain
sources, reviews = [], []
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
def acquire(name, revision, path):
    blob, chain = path_identity(revision, path)
    process = git('cat-file', 'blob', blob, check=False)
    url = 'https://raw.githubusercontent.com/angular/components/' + revision + '/' + path
    if process.returncode:
        with opener.open(urllib.request.Request(url, headers={'User-Agent': 'bounded-public-source-review'}), timeout=30) as response:
            assert response.status == 200
            raw = response.read(2_000_000)
        acquisition = 'anonymous-authoritative-immutable-raw-github'
    else:
        raw = process.stdout
        acquisition = 'existing-readonly-cache'
    assert obj('blob', raw) == blob
    target = Path(str(PREFIX) + name)
    assert not target.exists()
    target.write_bytes(raw)
    sources.append({'file': str(target.relative_to(ROOT)), 'revision': revision, 'upstream_path': path,
        'git_blob': blob, 'sha256': digest(raw), 'bytes': len(raw), 'acquisition': acquisition,
        'url': url, 'verified_tree_chain': chain})
    return raw
for name, sha, parent, path in SUBJECTS:
    commit(sha); commit(parent)
    changes = git('diff-tree', '-r', '--raw', '--no-abbrev', '--no-renames', sha).stdout.decode()
    assert len(changes.splitlines()) == 2
    assert changes.splitlines()[1].endswith(' M\t' + path)
    before = acquire(name + '-before.scss', parent, path)
    after = acquire(name + '-after.scss', sha, path)
    assert changes.splitlines()[1] == ':100644 100644 ' + obj('blob', before) + ' ' + obj('blob', after) + ' M\t' + path
    patch = ''.join(difflib.unified_diff(before.decode().splitlines(True), after.decode().splitlines(True),
        fromfile='a/' + path, tofile='b/' + path, n=max(len(before.splitlines()), len(after.splitlines()))))
    Path(str(PREFIX) + name + '-whole-original.patch').write_text(patch)
    reviews.append({'sha': sha, 'parent': parent, 'changed_paths': [path], 'raw_complete_changes': changes})
for name, path in [
 ('tagged-spinner.scss', 'src/material/progress-spinner/_progress-spinner-theme.scss'),
 ('tagged-legacy-spinner.scss', 'src/material/legacy-progress-spinner/_progress-spinner-theme.scss'),
 ('tagged-snack.scss', 'src/material/snack-bar/_snack-bar-theme.scss'),
 ('tagged-legacy-snack.scss', 'src/material/legacy-snack-bar/_snack-bar-theme.scss'),
 ('tagged-sass-utils.scss', 'src/material/core/style/_sass-utils.scss'),
 ('tagged-token-utils.scss', 'src/material/core/tokens/_token-utils.scss'),
]:
    acquire(name, TAG, path)
Path(str(PREFIX) + 'source-identities.json').write_text(json.dumps({'schema_version': 1,
    'commits': commits, 'reviews': reviews, 'sources': sources, 'source_only': True,
    'upstream_code_executed': False, 'shared_cache_mutated': False,
    'credentials_used': False, 'lazy_fetch_or_replacements': False}, indent=2) + '\n')
print(json.dumps({'authenticated_original_patches': len(reviews), 'authenticated_commits': len(commits),
    'authenticated_blobs_and_tree_chains': len(sources), 'anonymous_downloads': sum(source['acquisition'].startswith('anonymous') for source in sources)}))
