# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Capture complete original Git data; use a disposable object database, no upstream execution."""
import base64
from collections import Counter
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import urllib.request
import zlib

ROOT = Path.cwd()
PREFIX = 'compatibility/rc/21x-c04-slider-m3-repairs-'
CENSUS = 'compatibility/rc/upstream-complete-patch-census.json.gz'
SHAS = ['4550637812dadb67a9af21df261899eaf3f1ae4c', '90b37e5652bad1044dff3c4702aa4b73b715117a']
MIRROR = '/home/parallels/.cache/angular-components.git'
ENV = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
for name in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
    ENV.pop(name, None)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def git_hash(kind, raw):
    return hashlib.sha1(kind.encode() + b' ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()


scratch = tempfile.TemporaryDirectory(prefix='ngx-surface-m3-original-objects-')
objects = Path(scratch.name)
subprocess.run(['git', 'init', '--bare', '-q', str(objects)], check=True, env=ENV)
acquisitions = []
blob_cache = Path('/tmp/ngx-surface-m3-original-data-20261028')
blob_cache.mkdir(exist_ok=True)


def store(kind, raw):
    obj = git_hash(kind, raw)
    target = objects / 'objects' / obj[:2] / obj[2:]
    target.parent.mkdir(exist_ok=True)
    if not target.exists():
        target.write_bytes(zlib.compress(kind.encode() + b' ' + str(len(raw)).encode() + b'\0' + raw))
    return obj


def git(*args):
    return subprocess.check_output(['git', '--git-dir=' + MIRROR, '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', *args], env=ENV, stderr=subprocess.PIPE)


def local_git(*args):
    return subprocess.check_output(['git', '--git-dir=' + str(objects), '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', *args], env=ENV)


def blob_bytes(obj, commit_id, path):
    origin, url = 'available-object-read', None
    try:
        raw = git('cat-file', 'blob', obj)
    except subprocess.CalledProcessError:
        cached = blob_cache / obj
        if cached.is_file():
            raw, origin = cached.read_bytes(), 'verified-temporary-data-cache'
        else:
            url = 'https://raw.githubusercontent.com/angular/components/' + commit_id + '/' + path
            request = urllib.request.Request(url, headers={'User-Agent': 'ngx-legacy-original-source-data'})
            with urllib.request.urlopen(request, timeout=25) as response:
                raw = response.read(2 * 1024 * 1024 + 1)
            origin = 'pinned-upstream-raw'
            assert len(raw) <= 2 * 1024 * 1024 and git_hash('blob', raw) == obj
            with cached.open('xb') as stream:
                stream.write(raw)
    assert git_hash('blob', raw) == obj and store('blob', raw) == obj
    acquisitions.append({'commit': commit_id, 'path': path, 'blob': obj, 'sha256': digest(raw), 'origin': origin, 'url': url})
    print(json.dumps({'blob': obj, 'path': path, 'origin': origin}), flush=True)
    return raw


def ref(path):
    raw = (ROOT / path).read_bytes()
    return {'path': path, 'sha256': digest(raw), 'bytes': len(raw)}


def commit(sha):
    raw = git('cat-file', 'commit', sha)
    assert git_hash('commit', raw) == sha and store('commit', raw) == sha
    return raw.decode()


def tree_of(raw):
    return re.match(r'tree ([0-9a-f]{40})\n', raw).group(1)


trees = {}


def tree_member(tree, path):
    parts = path.split('/')
    assert all(part and part not in ('.', '..') for part in parts)
    for index, part in enumerate(parts):
        if tree not in trees:
            raw = git('cat-file', 'tree', tree)
            assert git_hash('tree', raw) == tree and store('tree', raw) == tree
            trees[tree] = {'tree': tree, 'sha256': digest(raw), 'bytes': len(raw), 'base64': base64.b64encode(raw).decode()}
        raw = base64.b64decode(trees[tree]['base64'])
        cursor, members = 0, {}
        while cursor < len(raw):
            space = raw.index(b' ', cursor)
            zero = raw.index(b'\0', space)
            mode, name = raw[cursor:space].decode(), raw[space + 1:zero].decode()
            obj = raw[zero + 1:zero + 21].hex()
            assert name not in members
            members[name] = (mode, obj)
            cursor = zero + 21
        assert cursor == len(raw)
        if part not in members:
            return None
        mode, obj = members[part]
        if index == len(parts) - 1:
            return mode, obj
        assert mode == '40000'
        tree = obj


def blob(path, mode, obj, tree, commit_id):
    observed = tree_member(tree, path)
    if mode == '000000':
        assert obj == '0' * 40 and observed is None
        return {'path': path, 'blob': obj, 'sha256': digest(b''), 'bytes': 0, 'body': '', 'absent': True}
    assert mode == '100644' and observed == (mode, obj)
    raw = blob_bytes(obj, commit_id, path)
    assert git_hash('blob', raw) == obj
    return {'path': path, 'blob': obj, 'sha256': digest(raw), 'bytes': len(raw), 'body': raw.decode()}


census_raw = (ROOT / CENSUS).read_bytes()
assert digest(census_raw) == '806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97'
census = json.loads(gzip.decompress(census_raw))
worksheet = json.loads((ROOT / 'compatibility/rc/remaining-native-admission-worksheet.json').read_bytes())['next_slider_m3_repairs_source_review']
assert worksheet['selected_sha_ids'] == SHAS
worksheet_path = PREFIX + 'source-worksheet.json'
with (ROOT / worksheet_path).open('x') as out:
    out.write(json.dumps(worksheet, indent=2) + '\n')
reviews, statuses, hunks_total = [], Counter(), 0
for sha in SHAS:
    row = next(row for row in census['commits'] if row['sha'] == sha)
    raw_commit = commit(sha)
    assert raw_commit == row['raw_commit'] and tree_of(raw_commit) == row['tree']
    parents = re.findall(r'^parent ([0-9a-f]{40})$', raw_commit, re.M)
    assert parents == row['parents'] and len(parents) == 1
    parent = parents[0]
    parent_raw = commit(parent)
    before_tree, after_tree = tree_of(parent_raw), row['tree']
    captured = []
    for member in row['complete_changed_files']:
        path = member['path']
        captured.append((member,
                         blob(path, member['before_mode'], member['before_blob'], before_tree, parent),
                         blob(path, member['after_mode'], member['after_blob'], after_tree, sha)))
    raw_diff = local_git('diff-tree', '--no-commit-id', '-r', '--raw', '--no-abbrev', '--no-renames', sha).decode()
    actual = []
    for line in raw_diff.splitlines():
        meta, path = line.split('\t')
        bm, am, bb, ab, status = meta[1:].split()
        actual.append({'path': path, 'status': status, 'before_mode': bm, 'after_mode': am, 'before_blob': bb, 'after_blob': ab})
    assert actual == row['complete_changed_files']
    diff = local_git('diff-tree', '--no-commit-id', '--full-index', '-p', '--no-renames', '--no-ext-diff', '--no-textconv', sha).decode()
    starts = list(re.finditer(r'^diff --git ', diff, re.M))
    patches = [diff[start.start():starts[i + 1].start() if i + 1 < len(starts) else len(diff)] for i, start in enumerate(starts)]
    assert len(patches) == row['complete_changed_file_count']
    sections = []
    for (member, before_member, after_member), patch in zip(captured, patches, strict=True):
        path = member['path']
        assert patch.startswith(f'diff --git a/{path} b/{path}\n')
        starts = list(re.finditer(r'^@@ .*$', patch, re.M))
        hunks = []
        for i, start in enumerate(starts):
            text = patch[start.start():starts[i + 1].start() if i + 1 < len(starts) else len(patch)]
            hunks.append({'index': i, 'header': start.group(), 'text': text, 'sha256': digest(text.encode())})
        statuses[member['status']] += 1
        hunks_total += len(hunks)
        sections.append({'path': path, 'status': member['status'], 'before_mode': member['before_mode'], 'after_mode': member['after_mode'],
                         'before': before_member,
                         'after': after_member,
                         'patch': patch, 'patch_sha256': digest(patch.encode()), 'hunks': hunks})
    reviews.append({'sha': sha, 'subject': row['seed_subject'], 'raw_commit': raw_commit, 'parent': parent,
                    'parent_raw_commit': parent_raw, 'before_tree': before_tree, 'after_tree': after_tree,
                    'diff': diff, 'diff_sha256': digest(diff.encode()), 'sections': sections,
                    'frozen_seed_paths': row['ledger_comparison']['listed_paths']})
assert sum(statuses.values()) == 9 and statuses == {'M': 9}
tag = 'df60e733c60e572ba538f6ad0ceff3e63e527b53'
tag_raw = commit(tag)
tag_tree = tree_of(tag_raw)
tag_paths = ['src/material/slider/_slider-theme.scss', 'src/material/slider/slider.scss',
             'src/material/legacy-slider/_slider-theme.scss', 'src/material/legacy-slider/slider.scss',
             'src/material/core/theming/_palette.scss', 'src/material/core/theming/_theming.scss']
tag_members = []
for path in tag_paths:
    mode, obj = tree_member(tag_tree, path)
    tag_members.append(blob(path, mode, obj, tag_tree, tag))
absent_tag_paths = ['src/material/core/tokens/m2/mat/_slider.scss']
for path in absent_tag_paths:
    assert tree_member(tag_tree, path) is None
packet = {'schema_version': 1, 'line': '21.x', 'role': 'Two complete original M3 slider visual repairs; Git data only',
          'producer': ref(PREFIX + 'originals-capture.py'), 'inputs': [ref(CENSUS), ref(worksheet_path)],
          'worksheet_at_capture': worksheet, 'reviews': reviews, 'tagged_reference': {'tag': '16.2.14', 'commit': tag, 'raw_commit': tag_raw, 'tree': tag_tree, 'members': tag_members, 'absent_paths': absent_tag_paths},
          'authenticated_tree_objects': [trees[key] for key in sorted(trees)], 'actual_status_occurrences': dict(statuses),
          'original_file_occurrences': 9, 'original_hunks': hunks_total, 'acquisitions': acquisitions,
          'project_or_shared_cache_git_mutations': 0, 'temporary_object_database_removed': True, 'public_pinned_data_network_reads': sum(row['origin'] == 'pinned-upstream-raw' for row in acquisitions), 'credentials_used': False,
          'upstream_code_executed': False, 'canonical_decisions_changed': 0, 'g11_claim': 'not-passed'}
out = PREFIX + 'originals.json.gz'
raw = gzip.compress((json.dumps(packet, indent=2) + '\n').encode(), mtime=0)
with (ROOT / out).open('xb') as target:
    target.write(raw)
scratch.cleanup()
print(json.dumps({'originals': ref(out), 'files': 9, 'hunks': hunks_total, 'tree_objects': len(trees),
                  'patches': [{'sha': row['sha'], 'diff_sha256': row['diff_sha256'], 'hunks': sum(len(s['hunks']) for s in row['sections'])} for row in reviews]}))
