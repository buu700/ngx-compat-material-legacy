# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Capture original Git data only; never execute upstream code or mutate Git."""
import base64
from collections import Counter
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path.cwd()
PREFIX = 'compatibility/rc/21x-c04-button-token-repairs-'
CENSUS = 'compatibility/rc/upstream-complete-patch-census.json.gz'
SEED = 'compatibility/rc/21x-c04-button-tokenization-originals.json.gz'
SHAS = ['1de6a3aa37118e4153fb995a8c8f4daecdf6d0b5', '702ccbe01446502f43e6e7cb365a587ee7558504']
MIRROR = '/home/parallels/.cache/angular-components.git'
ENV = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
for name in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
    ENV.pop(name, None)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def git_hash(kind, raw):
    return hashlib.sha1(kind.encode() + b' ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()


def git(*args):
    return subprocess.check_output(['git', '--git-dir=' + MIRROR, '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', *args], env=ENV)


def ref(path):
    raw = (ROOT / path).read_bytes()
    return {'path': path, 'sha256': digest(raw), 'bytes': len(raw)}


def commit(sha):
    raw = git('cat-file', 'commit', sha)
    assert git_hash('commit', raw) == sha
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
            assert git_hash('tree', raw) == tree
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


def blob(path, mode, obj, tree):
    observed = tree_member(tree, path)
    if mode == '000000':
        assert obj == '0' * 40 and observed is None
        return {'path': path, 'blob': obj, 'sha256': digest(b''), 'bytes': 0, 'body': '', 'absent': True}
    assert mode == '100644' and observed == (mode, obj)
    raw = git('cat-file', 'blob', obj)
    assert git_hash('blob', raw) == obj
    return {'path': path, 'blob': obj, 'sha256': digest(raw), 'bytes': len(raw), 'body': raw.decode()}


census_raw = (ROOT / CENSUS).read_bytes()
assert digest(census_raw) == '806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97'
census = json.loads(gzip.decompress(census_raw))
seed_raw = (ROOT / SEED).read_bytes()
assert digest(seed_raw) == '0c63465fed015d93af03cded959e871d448a0c555a6be19b5d88ff1ef8c1ba39'
seed = json.loads(gzip.decompress(seed_raw))
worksheet = json.loads((ROOT / 'compatibility/rc/remaining-native-admission-worksheet.json').read_bytes())['next_button_token_repairs_source_review']
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
    diff = git('diff-tree', '--no-commit-id', '--full-index', '-p', '--no-renames', '--no-ext-diff', '--no-textconv', sha).decode()
    starts = list(re.finditer(r'^diff --git ', diff, re.M))
    patches = [diff[start.start():starts[i + 1].start() if i + 1 < len(starts) else len(diff)] for i, start in enumerate(starts)]
    assert len(patches) == row['complete_changed_file_count']
    sections = []
    for member, patch in zip(row['complete_changed_files'], patches, strict=True):
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
                         'before': blob(path, member['before_mode'], member['before_blob'], before_tree),
                         'after': blob(path, member['after_mode'], member['after_blob'], after_tree),
                         'patch': patch, 'patch_sha256': digest(patch.encode()), 'hunks': hunks})
    reviews.append({'sha': sha, 'subject': row['seed_subject'], 'raw_commit': raw_commit, 'parent': parent,
                    'parent_raw_commit': parent_raw, 'before_tree': before_tree, 'after_tree': after_tree,
                    'diff': diff, 'diff_sha256': digest(diff.encode()), 'sections': sections,
                    'frozen_seed_paths': row['ledger_comparison']['listed_paths']})
assert sum(statuses.values()) == 9 and statuses == {'M': 5, 'D': 2, 'A': 2}
for member in seed['tagged_reference']['members']:
    raw = member['body'].encode()
    assert git_hash('blob', raw) == member['blob'] and digest(raw) == member['sha256']
packet = {'schema_version': 1, 'line': '21.x', 'role': 'Two complete original button token-repair/prefix patches; Git data only',
          'producer': ref(PREFIX + 'reference-capture.py'), 'inputs': [ref(CENSUS), ref(SEED), ref(worksheet_path)],
          'worksheet_at_capture': worksheet, 'reviews': reviews, 'tagged_reference': seed['tagged_reference'],
          'authenticated_tree_objects': [trees[key] for key in sorted(trees)], 'actual_status_occurrences': dict(statuses),
          'original_file_occurrences': 9, 'original_hunks': hunks_total, 'complete_deleted_modules': 2,
          'Git_reads_only': True, 'project_or_shared_cache_git_mutations': 0, 'network_or_credentials_used': False,
          'upstream_code_executed': False, 'canonical_decisions_changed': 0, 'g11_claim': 'not-passed'}
out = PREFIX + 'originals.json.gz'
raw = gzip.compress((json.dumps(packet, indent=2) + '\n').encode(), mtime=0)
with (ROOT / out).open('xb') as target:
    target.write(raw)
print(json.dumps({'originals': ref(out), 'files': 9, 'hunks': hunks_total, 'tree_objects': len(trees),
                  'patches': [{'sha': row['sha'], 'diff_sha256': row['diff_sha256'], 'hunks': sum(len(s['hunks']) for s in row['sections'])} for row in reviews]}))
