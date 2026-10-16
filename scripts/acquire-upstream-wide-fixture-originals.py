#!/usr/bin/env python3
# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Capture only two sealed wide fixture commits; execute no upstream source."""
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


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def git_hash(kind, raw):
    return hashlib.sha1(f'{kind} {len(raw)}\0'.encode() + raw).hexdigest()


EXPECTED = {
    '4718718e3f66e0de2341c9f46bae59be1470b971': (187, '18a045c4c3d6e0dca230f905064cdd4e70461c17751ff3c2a1a866cff27fe576'),
    '209176990ce1d70e904a3169460d18f081e26b76': (175, 'ec44094f2c28ec0f68c5aa40485fd031060933bb96af064a8e1b69594a0da7eb'),
}


def select_subjects(worksheet, census):
    """Only the two complete, sealed wide fixture commits; no generic limit increase."""
    assert worksheet.get('schema_version') == 1
    assert worksheet.get('line') in ('main', '21.x') and census.get('line') == worksheet['line']
    assert worksheet.get('subjects') == list(EXPECTED), 'only the two exact ordered wide subjects'
    by_sha = {row['sha']: row for row in census['commits']}
    assert len(by_sha) == len(census['commits']) == 1697
    selected = [by_sha[commit] for commit in EXPECTED]
    for row in selected:
        assert len(row['parents']) == 1
        assert git_hash('commit', row['raw_commit'].encode()) == row['sha']
        assert sha(row['raw_commit'].encode()) == row['raw_commit_sha256']
        files = row['complete_changed_files']
        count, sealed = EXPECTED[row['sha']]
        assert len(files) == count and len({member['path'] for member in files}) == count
        assert sha(json.dumps(files, sort_keys=True, separators=(',', ':')).encode()) == sealed, 'complete wide changed-file census differs'
        for member in files:
            path = member['path']
            assert member['status'] == 'M'
            assert member['before_mode'] == member['after_mode'] == '100644'
            assert isinstance(path, str) and path.startswith('src/') and path.endswith('.spec.ts')
            assert '\\' not in path and all(part not in ('', '.', '..') for part in path.split('/'))
            assert not any(ord(char) < 32 for char in path)
    return selected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--worksheet', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--acquisition', type=Path, required=True)
    args = parser.parse_args()
    assert not args.out.exists() and not args.acquisition.exists(), 'use fresh evidence destinations'
    worksheet_bytes = args.worksheet.read_bytes()
    worksheet = json.loads(worksheet_bytes)
    raw = (ROOT / CENSUS).read_bytes()
    census = json.loads(gzip.decompress(raw))
    selected = select_subjects(worksheet, census)
    env = {**os.environ, 'GIT_NO_LAZY_FETCH': '1', 'GIT_NO_REPLACE_OBJECTS': '1'}
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)
    rows, acquisitions = [], []
    with tempfile.TemporaryDirectory(prefix='ngx-upstream-test-objects-') as directory:
        subprocess.run(['git', 'init', '--bare', '--template=', '-q', directory], env=env, check=True)
        Path(directory, 'objects/info/alternates').write_text('/home/parallels/.cache/angular-components.git/objects\n')
        command = ['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', '--git-dir=' + directory]

        def git(*arguments, data=None):
            return subprocess.run(command + list(arguments), input=data, capture_output=True,
                                  env=env, check=True, timeout=30).stdout

        for original in selected:
            commit = original['sha']
            body = git('cat-file', 'commit', commit)
            assert git_hash('commit', body) == commit and sha(body) == original['raw_commit_sha256']
            assert body.decode() == original['raw_commit']
            assert git('rev-parse', commit + '^{tree}').decode().strip() == original['tree']
            captured = []
            for member in original['complete_changed_files']:
                path = member['path']
                sources = {'path': path}
                for side in ['before', 'after']:
                    blob = member[side + '_blob']
                    revision = original['parents'][0] if side == 'before' else commit
                    listing = git('ls-tree', '-z', revision, '--', path)
                    url = None
                    if blob == '0' * 40:
                        assert not listing
                        source, origin = b'', 'absent-original-member'
                    else:
                        assert member[side + '_mode'] in ('100644', '100755')
                        metadata, actual_path = listing.rstrip(b'\0').split(b'\t')
                        assert actual_path.decode() == path
                        assert metadata.decode().split() == [member[side + '_mode'], 'blob', blob]
                        available = subprocess.run(command + ['cat-file', 'blob', blob], capture_output=True, env=env)
                        if available.returncode == 0:
                            source, origin = available.stdout, 'existing-cache'
                        else:
                            url = 'https://raw.githubusercontent.com/angular/components/' + revision + '/' + urllib.parse.quote(path, safe='/')
                            request = urllib.request.Request(url, headers={'User-Agent': 'ngx-legacy-source-review'})
                            with urllib.request.urlopen(request, timeout=30) as response:
                                source = response.read(2 * 1024 * 1024 + 1)
                            assert len(source) <= 2 * 1024 * 1024
                            assert git_hash('blob', source) == blob, 'download differs from original Git blob'
                            assert git('hash-object', '-w', '--stdin', data=source).decode().strip() == blob
                            origin = 'immutable-upstream-raw'
                        assert git_hash('blob', source) == blob
                    sources[side] = {'git_blob': blob, 'sha256': sha(source), 'bytes': len(source), 'text': source.decode()}
                    acquisitions.append({'commit': commit, 'path': path, 'side': side, 'revision': revision,
                                         'git_blob': blob, 'sha256': sha(source), 'bytes': len(source), 'source': origin, 'url': url})
                captured.append(sources)
                if len(captured) % 32 == 0:
                    print(json.dumps({'sha': commit, 'complete_files_captured': len(captured), 'expected_complete_files': len(original['complete_changed_files'])}), flush=True)
            diff = git('show', '--format=', '--no-color', '--no-renames', '--no-ext-diff', '--no-textconv', '--full-index', commit)
            headers = [line.split(' b/', 1)[1] for line in diff.decode().splitlines() if line.startswith('diff --git ')]
            assert headers == [member['path'] for member in original['complete_changed_files']], 'incomplete original changed-file capture'
            rows.append({'sha': commit, 'subject': original['seed_subject'], 'raw_commit': body.decode(),
                         'raw_commit_sha256': sha(body), 'tree': original['tree'], 'parents': original['parents'],
                         'members': captured, 'complete_changed_files': original['complete_changed_files'],
                         'diff': diff.decode(), 'diff_sha256': sha(diff), 'diff_bytes': len(diff),
                         'original_hunks': len(re.findall(rb'^@@ ', diff, re.M)), 'source_review_complete': False})
            print(json.dumps({'sha': commit, 'files': len(captured), 'bytes': len(diff), 'hunks': rows[-1]['original_hunks']}), flush=True)
    producer_path = Path(__file__).resolve().relative_to(ROOT).as_posix()
    producer = {'path': producer_path, 'sha256': sha((ROOT / producer_path).read_bytes())}
    selection = {'worksheet_path': str(args.worksheet), 'sha256': sha(worksheet_bytes), 'worksheet_text': worksheet_bytes.decode()}
    packet = {'schema_version': 1, 'line': worksheet['line'], 'selection': selection,
              'source_inventory': {'path': CENSUS, 'sha256': sha(raw)}, 'subjects': rows, 'producer': producer,
              'source_acquisition_only': True, 'actual_native_packed_or_floor_qualified': False, 'g11_claim': 'not-passed'}
    record = {'schema_version': 1, 'line': worksheet['line'], 'selection': selection, 'producer': producer,
              'subjects': worksheet['subjects'], 'members': acquisitions, 'private_temporary_object_view_removed': True,
              'shared_cache_written': False, 'upstream_or_candidate_source_executed': False,
              'credentials_used_or_changed': False, 'source_review_complete': False,
              'actual_native_packed_or_floor_qualified': False, 'g11_claim': 'not-passed'}
    for destination, value in [(args.out, packet), (args.acquisition, record)]:
        with destination.open('xb') as output:
            output.write(gzip.compress((json.dumps(value, indent=2) + '\n').encode(), mtime=0))


if __name__ == '__main__':
    main()
