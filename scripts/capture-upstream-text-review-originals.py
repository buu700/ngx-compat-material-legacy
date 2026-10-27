#!/usr/bin/env python3
# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Capture worksheet-selected regular text M/A/D files; never execute upstream code."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
CENSUS = 'compatibility/rc/upstream-complete-patch-census.json.gz'
CENSUS_HASH = '806433925a6216b52b26a98b3b91eb7129a506ab0363573b7cc21063c1366e97'
TAG = 'df60e733c60e572ba538f6ad0ceff3e63e527b53'
HASH = lambda raw: hashlib.sha256(raw).hexdigest()


def object_id(kind, raw):
    return hashlib.sha1(kind.encode() + b' ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()


def safe_path(path):
    assert isinstance(path, str) and '\\' not in path
    assert all(part and part not in ('.', '..') for part in path.split('/'))
    assert not any(ord(char) < 32 for char in path)
    return path


def capture(worksheet_path, mirror, allow_source_fetch, seed_originals=None):
    worksheet_path = worksheet_path.resolve()
    relative = worksheet_path.relative_to(ROOT).as_posix()
    assert relative.startswith('compatibility/rc/') and relative.endswith('worksheet.json')
    worksheet_raw = worksheet_path.read_bytes()
    worksheet = json.loads(worksheet_raw)
    selected = worksheet['selected_sha_ids']
    assert selected and len(selected) == len(set(selected)) <= 32
    assert all(re.fullmatch('[0-9a-f]{40}', sha) for sha in selected)
    census_raw = (ROOT / CENSUS).read_bytes()
    assert HASH(census_raw) == CENSUS_HASH
    census = json.loads(gzip.decompress(census_raw))
    assert len(census['commits']) == len({row['sha'] for row in census['commits']}) == 1697
    rows = [next(row for row in census['commits'] if row['sha'] == sha) for sha in selected]
    assert sum(len(row['complete_changed_files']) for row in rows) == worksheet['original_file_occurrences']
    env = {**os.environ, 'GIT_NO_LAZY_FETCH': '1', 'GIT_NO_REPLACE_OBJECTS': '1'}
    for name in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(name, None)
    acquisitions, reviews = [], []
    seed_hash = None
    with tempfile.TemporaryDirectory(prefix='ngx-reviewed-original-objects-') as directory:
        subprocess.run(['git', 'init', '--bare', '--template=', '-q', directory], env=env, check=True)
        Path(directory, 'objects/info/alternates').write_text(str(mirror.resolve() / 'objects') + '\n')

        def git(*args, data=None):
            return subprocess.run(['git', '--no-replace-objects', '--git-dir=' + directory,
                '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', *args], env=env, input=data,
                capture_output=True, check=True, timeout=30).stdout

        if seed_originals is not None:
            seed_raw = seed_originals.read_bytes()
            seed_hash = HASH(seed_raw)
            assert len(seed_raw) <= 16 * 1024 * 1024
            with gzip.GzipFile(fileobj=__import__('io').BytesIO(seed_raw)) as stream:
                decoded = stream.read(64 * 1024 * 1024 + 1)
            assert len(decoded) <= 64 * 1024 * 1024
            seed = json.loads(decoded)
            members = [member for row in seed['reviews'] for section in row['sections']
                       for member in [section['before'], section['after']]] + seed['tagged_reference']['members']
            for value in members:
                raw = value['body'].encode()
                if value['blob'] == '0' * 40:
                    assert value.get('absent') is True and raw == b'' and value['bytes'] == 0 and HASH(raw) == value['sha256']
                    continue
                assert object_id('blob', raw) == value['blob'] and HASH(raw) == value['sha256']
                assert git('hash-object', '-w', '--stdin', data=raw).decode().strip() == value['blob']

        def member(commit, path, expected=None):
            safe_path(path)
            listing = git('ls-tree', '-z', commit, '--', path).rstrip(b'\0')
            if expected == '0' * 40:
                assert listing == b'', 'absent source unexpectedly present: ' + path
                acquisitions.append(dict(commit=commit, path=path, blob=expected, origin='verified-absent-tree-member', url=None, sha256=HASH(b'')))
                return dict(path=path, blob=expected, sha256=HASH(b''), bytes=0, body='', absent=True)
            metadata, actual = listing.split(b'\t')
            mode, kind, blob = metadata.decode().split()
            assert actual.decode() == path and mode == '100644' and kind == 'blob'
            if expected is not None:
                assert blob == expected
            result = subprocess.run(['git', '--no-replace-objects', '--git-dir=' + directory,
                'cat-file', 'blob', blob], env=env, capture_output=True, timeout=30)
            url, origin = None, 'available-object-read'
            if result.returncode == 0:
                raw = result.stdout
            else:
                assert allow_source_fetch, 'missing cached original blob: ' + blob + ' ' + path
                url = 'https://raw.githubusercontent.com/angular/components/' + commit + '/' + urllib.parse.quote(path, safe='/')
                request = urllib.request.Request(url, headers={'User-Agent': 'ngx-legacy-original-review'})
                with urllib.request.urlopen(request, timeout=30) as response:
                    raw = response.read(2 * 1024 * 1024 + 1)
                assert len(raw) <= 2 * 1024 * 1024 and object_id('blob', raw) == blob
                assert git('hash-object', '-w', '--stdin', data=raw).decode().strip() == blob
                origin = 'pinned-upstream-raw'
            assert object_id('blob', raw) == blob
            acquisitions.append(dict(commit=commit, path=path, blob=blob, origin=origin, url=url, sha256=HASH(raw)))
            return dict(path=path, blob=blob, sha256=HASH(raw), bytes=len(raw), body=raw.decode())

        for row in rows:
            sha = row['sha']
            commit = git('cat-file', 'commit', sha)
            assert object_id('commit', commit) == sha and commit.decode() == row['raw_commit']
            assert len(row['parents']) == 1
            parent = row['parents'][0]
            sections = []
            expected_paths = [m['path'] for m in row['complete_changed_files']]
            for m in row['complete_changed_files']:
                assert m['status'] in ('M', 'A', 'D')
                assert (m['before_mode'], m['after_mode']) == {'M': ('100644', '100644'), 'A': ('000000', '100644'), 'D': ('100644', '000000')}[m['status']]
                for side in ['before', 'after']:
                    assert (m[side + '_blob'] == '0' * 40) == (m[side + '_mode'] == '000000')
                before, after = member(parent, m['path'], m['before_blob']), member(sha, m['path'], m['after_blob'])
                assert '\0' not in before['body'] + after['body'], 'binary source outside regular text capture scope'
                sections.append(dict(path=m['path'], status=m['status'], before_mode=m['before_mode'], after_mode=m['after_mode'], before=before, after=after))
            patch = git('show', '--format=', '--no-color', '--no-ext-diff', '--no-textconv', '--no-renames', '--full-index', sha).decode()
            parts = re.split(r'(?=^diff --git )', patch, flags=re.M)[1:]
            assert len(parts) == len(sections)
            for section, text in zip(sections, parts):
                path = section['path']
                assert text.startswith(f'diff --git a/{path} b/{path}\n')
                section.update(patch=text, patch_sha256=HASH(text.encode()), hunks=[
                    dict(index=i, header=h.splitlines()[0], text=h, sha256=HASH(h.encode()))
                    for i, h in enumerate(re.split(r'(?=^@@ )', text, flags=re.M)[1:])])
            assert [s['path'] for s in sections] == expected_paths and ''.join(s['patch'] for s in sections) == patch
            assert all(section['hunks'] for section in sections), 'non-text or empty-mode-only patch outside this scope'
            reviews.append(dict(sha=sha, subject=row['seed_subject'], raw_commit=commit.decode(), parent=parent,
                diff=patch, diff_sha256=HASH(patch.encode()), sections=sections,
                frozen_seed_paths=row['ledger_comparison']['listed_paths']))
        reference_paths = worksheet['tag_source_paths']
        assert reference_paths and len(reference_paths) == len(set(reference_paths)) <= 128
        tagged = [member(TAG, path) for path in reference_paths]
    from collections import Counter
    statuses = dict(Counter(section['status'] for row in reviews for section in row['sections']))
    assert statuses == worksheet['expected_status_occurrences']
    return dict(schema_version=1, supported_statuses=['M', 'A', 'D'], actual_status_occurrences=statuses, line=worksheet['line'], role='Original text/context capture only; no review, disposition or product-execution credit',
        inputs=[dict(path=CENSUS, sha256=CENSUS_HASH), dict(path=relative, sha256=HASH(worksheet_raw), role='Capture-time body embedded below')],
        worksheet_at_capture=worksheet_raw.decode(), reviews=reviews,
        tagged_reference=dict(tag='16.2.14', commit=TAG, members=tagged), acquisitions=acquisitions,
        original_file_occurrences=sum(len(row['sections']) for row in reviews),
        original_hunks=sum(len(section['hunks']) for row in reviews for section in row['sections']),
        seed_capsule_sha256=seed_hash, seed_role='Optional blob cache only; original commit/tree/blob identity remains mandatory',
        project_or_shared_cache_git_mutations=False, temporary_object_repository_removed=True,
        upstream_code_executed=False, credentials_used=False, canonical_decisions_changed=0, g11_claim='not-passed')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--worksheet', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--mirror', type=Path, default=Path('/home/parallels/.cache/angular-components.git'))
    parser.add_argument('--allow-source-fetch', action='store_true')
    parser.add_argument('--seed-originals', type=Path)
    args = parser.parse_args()
    data = capture(args.worksheet, args.mirror, args.allow_source_fetch, args.seed_originals)
    output = args.out.resolve()
    assert output.relative_to(ROOT).as_posix().startswith(json.loads(data['worksheet_at_capture'])['artifact_prefix'])
    payload = gzip.compress((json.dumps(data, indent=2) + '\n').encode(), mtime=0)
    with output.open('xb') as stream:
        stream.write(payload)
    print(json.dumps(dict(path=str(output.relative_to(ROOT)), sha256=HASH(payload), bytes=len(payload),
        commits=len(data['reviews']), files=data['original_file_occurrences'], hunks=data['original_hunks'],
        fetched=sum(row['origin'] == 'pinned-upstream-raw' for row in data['acquisitions']))))
