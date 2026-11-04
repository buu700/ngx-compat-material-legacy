#!/usr/bin/env python3
# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Acquire immutable public sources for one cursor-applicability review."""
import difflib
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
PREFIX = ROOT / 'compatibility/rc/parallel-select-pointer-cursor-'
CACHE = '/home/parallels/.cache/angular-components.git'
SHA = '373a0cbf9531ea9ae0c9eb0e9cbf70f049f863b7'
PARENT = '503cb2f18055aa88c717feab037415359aad4041'
TAG = 'df60e733c60e572ba538f6ad0ceff3e63e527b53'

def obj(kind, raw):
    return hashlib.sha1(f'{kind} {len(raw)}\0'.encode() + raw).hexdigest()

def git(*args, check=True):
    env = {k: v for k, v in os.environ.items() if not k.startswith('GIT_')}
    env.update(GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    return subprocess.run(['git', '--no-replace-objects', '-c', 'gc.auto=0',
        '-c', 'maintenance.auto=0', '-c', 'remote.origin.promisor=false',
        '-c', 'extensions.partialClone=', '--git-dir=' + CACHE, *args],
        capture_output=True, check=check, env=env, timeout=30)

def path_identity(rev, path):
    commit = git('cat-file', 'commit', rev).stdout
    assert obj('commit', commit) == rev
    tree = commit.splitlines()[0].decode().split()[1]
    chain = []
    parts = path.split('/')
    for at, part in enumerate(parts):
        raw = git('cat-file', 'tree', tree).stdout
        assert obj('tree', raw) == tree
        entries, cursor = {}, 0
        while cursor < len(raw):
            end = raw.index(b'\0', cursor)
            mode, name = raw[cursor:end].split(b' ', 1)
            oid = raw[end + 1:end + 21].hex()
            assert len(oid) == 40
            entries[name.decode()] = (mode.decode(), oid)
            cursor = end + 21
        mode, selected = entries[part]
        chain.append({'tree': tree, 'sha256': hashlib.sha256(raw).hexdigest(),
            'name': part, 'mode': mode, 'selected_object': selected})
        if at + 1 < len(parts):
            assert mode == '40000'
            tree = selected
    assert mode == '100644'
    return selected, chain

commits = {}
for rev in [SHA, PARENT, TAG]:
    raw = git('cat-file', 'commit', rev).stdout
    assert obj('commit', raw) == rev
    commits[rev] = {'raw_commit': raw.decode(), 'sha256': hashlib.sha256(raw).hexdigest()}
changes = git('diff-tree', '-r', '--raw', '--no-abbrev', '--no-renames', SHA).stdout
assert changes.decode().splitlines()[1:] == [
    ':100644 100644 59ab26c8efd8410174658f37337948a3240e5a24 e27bbf5bc32c3d181ceda72eda281022d67e558c M\tsrc/material/select/select.scss']
subjects = [
    ('upstream-before.scss', PARENT, 'src/material/select/select.scss'),
    ('upstream-after.scss', SHA, 'src/material/select/select.scss'),
    ('upstream-select.html', SHA, 'src/material/select/select.html'),
    ('upstream-select.ts', SHA, 'src/material/select/select.ts'),
    ('upstream-form-field.html', SHA, 'src/material/form-field/form-field.html'),
    ('upstream-form-field.ts', SHA, 'src/material/form-field/form-field.ts'),
    ('tagged-select.scss', TAG, 'src/material/legacy-select/select.scss'),
    ('tagged-select.html', TAG, 'src/material/legacy-select/select.html'),
    ('tagged-select.ts', TAG, 'src/material/legacy-select/select.ts'),
    ('tagged-select-base.ts', TAG, 'src/material/select/select.ts'),
    ('tagged-form-field.scss', TAG, 'src/material/legacy-form-field/form-field.scss'),
    ('tagged-form-field.html', TAG, 'src/material/legacy-form-field/form-field.html'),
    ('tagged-form-field.ts', TAG, 'src/material/legacy-form-field/form-field.ts'),
]
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
sources = []
for name, rev, path in subjects:
    blob, chain = path_identity(rev, path)
    proc = git('cat-file', 'blob', blob, check=False)
    url = 'https://raw.githubusercontent.com/angular/components/' + rev + '/' + path
    if proc.returncode:
        with opener.open(urllib.request.Request(url, headers={'User-Agent': 'bounded-public-source-review'}), timeout=30) as response:
            raw = response.read(2_000_000)
            assert response.status == 200
        acquisition = 'anonymous-authoritative-raw-github; shared cache unchanged'
    else:
        raw = proc.stdout
        acquisition = 'existing-readonly-cache'
    assert obj('blob', raw) == blob, (name, blob, obj('blob', raw))
    target = Path(str(PREFIX) + name)
    assert not target.exists(), target
    target.write_bytes(raw)
    sources.append({'file': str(target.relative_to(ROOT)), 'upstream_revision': rev,
        'upstream_path': path, 'git_blob': blob, 'sha256': hashlib.sha256(raw).hexdigest(),
        'bytes': len(raw), 'acquisition': acquisition, 'url': url, 'verified_tree_chain': chain})
before = Path(str(PREFIX) + 'upstream-before.scss').read_text().splitlines(keepends=True)
after = Path(str(PREFIX) + 'upstream-after.scss').read_text().splitlines(keepends=True)
Path(str(PREFIX) + 'whole-original.patch').write_text(''.join(difflib.unified_diff(
    before, after, fromfile='a/src/material/select/select.scss', tofile='b/src/material/select/select.scss',
    n=max(len(before), len(after)))))
report = {'schema_version': 1, 'upstream_sha': SHA, 'commits': commits,
    'raw_complete_changes': changes.decode(), 'sources': sources,
    'source_only': True, 'upstream_code_executed': False, 'shared_cache_mutated': False,
    'credentials_read_or_used': False, 'replacements_or_lazy_fetch': False}
Path(str(PREFIX) + 'source-identities.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'authenticated_commits': len(commits), 'authenticated_blobs_and_tree_chains': len(sources),
    'anonymous_downloads': sum(source['acquisition'].startswith('anonymous') for source in sources)}, indent=2))
