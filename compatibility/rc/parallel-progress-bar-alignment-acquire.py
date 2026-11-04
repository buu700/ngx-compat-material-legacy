#!/usr/bin/env python3
# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Read-only exact-source acquisition for one bounded upstream review."""
import difflib
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
PREFIX = ROOT / 'compatibility/rc/parallel-progress-bar-alignment-'
CACHE = '/home/parallels/.cache/angular-components.git'
SHA = '43dbbe2e5eec4fc4e76950a29edc3efd94027ff9'
PARENT = 'bbc807a1c97df747064c7056a8831f87fd4a81f9'
TAG = 'df60e733c60e572ba538f6ad0ceff3e63e527b53'

def obj(kind, raw):
    return hashlib.sha1(f'{kind} {len(raw)}\0'.encode() + raw).hexdigest()

def git(*args, check=True):
    env = {k: v for k, v in os.environ.items() if not k.startswith('GIT_')}
    env.update(GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    proc = subprocess.run(['git', '--no-replace-objects', '-c', 'gc.auto=0',
        '-c', 'maintenance.auto=0', '-c', 'remote.origin.promisor=false',
        '-c', 'extensions.partialClone=', '--git-dir=' + CACHE, *args],
        capture_output=True, check=check, env=env, timeout=30)
    return proc

commits = {}
for rev in [SHA, PARENT, TAG]:
    raw = git('cat-file', 'commit', rev).stdout
    assert obj('commit', raw) == rev
    commits[rev] = {'raw_commit': raw.decode(), 'sha256': hashlib.sha256(raw).hexdigest()}

raw_changes = git('diff-tree', '-r', '--raw', '--no-abbrev', '--no-renames', SHA).stdout
assert raw_changes.decode().splitlines()[1:] == [
    ':100644 100644 d95748e39404822bee9e0f1a35da2fd2a0868da3 d884ae69d17435a78ae571f71ee56e38c53a9398 M\tsrc/material/progress-bar/progress-bar.scss']
sources = []
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
subjects = [
    ('upstream-before.scss', PARENT, 'src/material/progress-bar/progress-bar.scss'),
    ('upstream-after.scss', SHA, 'src/material/progress-bar/progress-bar.scss'),
    ('upstream-template.html', SHA, 'src/material/progress-bar/progress-bar.html'),
    ('tagged-legacy.scss', TAG, 'src/material/legacy-progress-bar/progress-bar.scss'),
    ('tagged-legacy.html', TAG, 'src/material/legacy-progress-bar/progress-bar.html'),
    ('tagged-legacy.ts', TAG, 'src/material/legacy-progress-bar/progress-bar.ts'),
    ('tagged-legacy.spec.ts', TAG, 'src/material/legacy-progress-bar/progress-bar.spec.ts'),
]
for name, rev, path in subjects:
    tree_entry = git('ls-tree', rev, '--', path).stdout.decode().strip()
    mode, kind, rest = tree_entry.split(' ', 2)
    blob, actual_path = rest.split('\t')
    assert mode == '100644' and kind == 'blob' and actual_path == path
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
    destination = Path(str(PREFIX) + name)
    assert not destination.exists(), destination
    destination.write_bytes(raw)
    sources.append({'file': str(destination.relative_to(ROOT)), 'upstream_revision': rev,
        'upstream_path': path, 'git_blob': blob, 'sha256': hashlib.sha256(raw).hexdigest(),
        'bytes': len(raw), 'acquisition': acquisition, 'url': url})

before = Path(str(PREFIX) + 'upstream-before.scss').read_text().splitlines(keepends=True)
after = Path(str(PREFIX) + 'upstream-after.scss').read_text().splitlines(keepends=True)
Path(str(PREFIX) + 'whole-original.patch').write_text(''.join(difflib.unified_diff(
    before, after, fromfile='a/src/material/progress-bar/progress-bar.scss',
    tofile='b/src/material/progress-bar/progress-bar.scss', n=max(len(before), len(after)))))
report = {'schema_version': 1, 'upstream_sha': SHA, 'commits': commits,
    'raw_complete_changes': raw_changes.decode(), 'sources': sources,
    'source_only': True, 'upstream_code_executed': False, 'shared_cache_mutated': False,
    'credentials_read_or_used': False, 'replacements_or_lazy_fetch': False}
Path(str(PREFIX) + 'source-identities.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'authenticated_commits': len(commits), 'authenticated_blobs': len(sources),
    'sources': [{k: x[k] for k in ['file', 'git_blob', 'acquisition']} for x in sources]}, indent=2))
