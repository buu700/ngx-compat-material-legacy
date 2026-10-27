#!/usr/bin/env python3
# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Read five complete token-placement patches from authenticated cached Git objects."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'compatibility/rc/21x-c04-unthemable-token-placement-'
SELECTED = [
    ('03a773a0237843fd1e1e600d0b9911eb924319bc', 'checkbox'),
    ('047404067865a2452bfcb93b2374ac07aca319be', 'progress-bar'),
    ('ccd2d7fa72f4566ab2c2aeb78a5ac4b7d4149bbf', 'tooltip'),
    ('593fc79ecbc6677f04e2d3707bff024b00a517e8', 'progress-spinner'),
    ('06460d17703ef28a8fc89833c389c479b1ba6bcf', 'card'),
]
TAG = 'df60e733c60e572ba538f6ad0ceff3e63e527b53'
HASH = lambda raw: hashlib.sha256(raw).hexdigest()


def object_id(kind, raw):
    return hashlib.sha1(kind.encode() + b' ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()


def acquire(mirror):
    worksheet_raw = (ROOT / (PREFIX + 'worksheet.json')).read_bytes()
    worksheet = json.loads(worksheet_raw)
    assert worksheet['line'] == '21.x'
    assert worksheet['selected_sha_ids'] == [sha for sha, _ in SELECTED]
    census_path = 'compatibility/rc/upstream-complete-patch-census.json.gz'
    raw = (ROOT / census_path).read_bytes()
    assert HASH(raw) == '806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97'
    census = json.loads(gzip.decompress(raw))
    env = {**os.environ, 'GIT_NO_LAZY_FETCH': '1', 'GIT_NO_REPLACE_OBJECTS': '1'}
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)

    def git(*args):
        return subprocess.check_output(['git', '--no-replace-objects', '--git-dir=' + str(mirror),
            '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', *args], env=env)

    def member(commit, path):
        blob = git('rev-parse', commit + ':' + path).decode().strip()
        body = git('cat-file', 'blob', blob)
        assert object_id('blob', body) == blob
        return dict(path=path, blob=blob, sha256=HASH(body), bytes=len(body), body=body.decode())

    reviews = []
    for sha, family in SELECTED:
        known = next(row for row in census['commits'] if row['sha'] == sha)
        commit = git('cat-file', 'commit', sha)
        assert object_id('commit', commit) == sha
        assert commit.decode() == known['raw_commit']
        assert len(known['parents']) == 1
        parent = known['parents'][0]
        expected = ['src/material/_index.scss', f'src/material/{family}/_{family}-theme.scss',
                    f'src/material/{family}/{family}.scss']
        assert [row['path'] for row in known['complete_changed_files']] == expected
        changed = git('diff-tree', '--no-commit-id', '--name-only', '-r', sha).decode().splitlines()
        assert changed == expected
        patch = git('diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--full-index', parent, sha, '--', *expected).decode()
        sections = []
        for path, text in zip(expected, re.split(r'(?=^diff --git )', patch, flags=re.M)[1:]):
            assert text.startswith(f'diff --git a/{path} b/{path}\n')
            before, after = member(parent, path), member(sha, path)
            index = re.search(r'(?m)^index ([0-9a-f]{40})\.\.([0-9a-f]{40}) 100644$', text)
            assert index and (index[1], index[2]) == (before['blob'], after['blob'])
            hunks = [dict(index=i, header=h.splitlines()[0], text=h, sha256=HASH(h.encode()))
                     for i, h in enumerate(re.split(r'(?=^@@ )', text, flags=re.M)[1:])]
            sections.append(dict(path=path, patch=text, patch_sha256=HASH(text.encode()),
                                 before=before, after=after, hunks=hunks))
        assert ''.join(row['patch'] for row in sections) == patch
        assert [len(row['hunks']) for row in sections] == [1, 2, 1]
        reviews.append(dict(sha=sha, family=family, raw_commit=commit.decode(), parent=parent,
                            diff=patch, diff_sha256=HASH(patch.encode()), sections=sections,
                            frozen_seed_paths=known['ledger_comparison']['listed_paths']))
    paths = ['src/material/_index.scss']
    for _, family in SELECTED:
        paths.extend([f'src/material/{family}/_{family}-theme.scss',
                      f'src/material/{family}/{family}.scss',
                      f'src/material/legacy-{family}/_{family}-theme.scss',
                      f'src/material/legacy-{family}/{family}.scss'])
    return dict(schema_version=1, line='21.x', role='Complete originals only; no disposition or product execution credit',
                inputs=[dict(path=census_path, sha256=HASH(raw)),
                        dict(path=PREFIX + 'worksheet.json', sha256=HASH(worksheet_raw),
                             role='Capture-time worksheet body retained below; current progress may advance')],
                worksheet_at_capture=worksheet_raw.decode(),
                reviews=reviews, tagged_reference=dict(tag='16.2.14', commit=TAG,
                    members=[member(TAG, path) for path in paths]),
                original_file_occurrences=15, original_hunks=20, authenticated_before_after_blobs=30,
                remote_or_repository_mutations=0, credentials_used=False, upstream_code_executed=False,
                canonical_decisions_changed=0, g11_claim='not-passed')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mirror', type=Path, default=Path('/home/parallels/.cache/angular-components.git'))
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    data = acquire(args.mirror)
    payload = gzip.compress((json.dumps(data, indent=2) + '\n').encode(), mtime=0)
    with args.out.open('xb') as output:
        output.write(payload)
    print(json.dumps(dict(path=str(args.out), sha256=HASH(payload), bytes=len(payload),
                         original_file_occurrences=15, original_hunks=20)))
