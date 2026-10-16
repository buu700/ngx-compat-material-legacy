#!/usr/bin/env python3
# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Acquire six immutable review subjects; no upstream or candidate code executes."""
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
SUBJECTS = ['47ac55fcdc5178f094ad5e8bb2d378f1525d02a8', '917f0026b1c0b0d80672b0ea1a79a2f0a4bd6e7b',
            '8e091797f8664cf99af86a5c7c4d5615734fcaf1', '69e1369c99df0d28a8f305a64fe90d5b58dd8b6a',
            'df7104f86f19bf34846e9081be232489ca4f120d', '886fb6d156938aa088093fd5602a9691e79dfc74']


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def git_hash(kind, raw):
    return hashlib.sha1(f'{kind} {len(raw)}\0'.encode() + raw).hexdigest()


def main():
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--acquisition', type=Path, required=True)
    args = parser.parse_args()
    assert not args.out.exists() and not args.acquisition.exists(), 'use fresh evidence destinations'
    source_path = 'compatibility/rc/upstream-complete-patch-census.json.gz'
    raw = (ROOT / source_path).read_bytes()
    census = json.loads(gzip.decompress(raw))
    subjects = {row['sha']: row for row in census['commits']}
    selected = [subjects[commit] for commit in SUBJECTS]
    assert all(len(row['parents']) == 1 and len(row['complete_changed_files']) == 1 for row in selected)
    env = {**os.environ, 'GIT_NO_LAZY_FETCH': '1', 'GIT_NO_REPLACE_OBJECTS': '1'}
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)
    rows, acquisitions = [], []
    with tempfile.TemporaryDirectory(prefix='ngx-spec-source-objects-') as directory:
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
            member = original['complete_changed_files'][0]
            path = member['path']
            assert path.startswith('src/') and path.endswith('.spec.ts') and '..' not in path.split('/')
            captured = {'path': path}
            for side in ['before', 'after']:
                blob = member[side + '_blob']
                assert blob != '0' * 40 and member[side + '_mode'] == '100644'
                revision = original['parents'][0] if side == 'before' else commit
                assert git('rev-parse', revision + ':' + path).decode().strip() == blob
                available = subprocess.run(command + ['cat-file', 'blob', blob], capture_output=True, env=env)
                url = None
                if available.returncode == 0:
                    source = available.stdout
                else:
                    url = 'https://raw.githubusercontent.com/angular/components/' + revision + '/' + urllib.parse.quote(path, safe='/')
                    request = urllib.request.Request(url, headers={'User-Agent': 'ngx-legacy-source-review'})
                    with urllib.request.urlopen(request, timeout=30) as response:
                        source = response.read(2 * 1024 * 1024 + 1)
                    assert len(source) <= 2 * 1024 * 1024
                    assert git_hash('blob', source) == blob, 'download differs from original Git blob'
                    assert git('hash-object', '-w', '--stdin', data=source).decode().strip() == blob
                assert git_hash('blob', source) == blob
                captured[side] = {'git_blob': blob, 'sha256': sha(source), 'bytes': len(source), 'text': source.decode()}
                acquisitions.append({'commit': commit, 'path': path, 'side': side, 'revision': revision,
                                     'git_blob': blob, 'sha256': sha(source), 'bytes': len(source),
                                     'source': 'immutable-upstream-raw' if url else 'existing-cache', 'url': url})
            diff = git('show', '--format=', '--no-color', '--no-renames', '--no-ext-diff', '--no-textconv', '--full-index', commit)
            headers = [line.split(' b/', 1)[1] for line in diff.decode().splitlines() if line.startswith('diff --git ')]
            assert headers == [path]
            rows.append({'sha': commit, 'subject': original['seed_subject'], 'raw_commit': body.decode(),
                         'raw_commit_sha256': sha(body), 'tree': original['tree'], 'parents': original['parents'],
                         'members': [captured], 'complete_changed_files': original['complete_changed_files'],
                         'diff': diff.decode(), 'diff_sha256': sha(diff), 'diff_bytes': len(diff),
                         'original_hunks': len(re.findall(rb'^@@ ', diff, re.M)), 'source_review_complete': False})
            print(json.dumps({'sha': commit, 'bytes': len(diff), 'hunks': rows[-1]['original_hunks']}), flush=True)
    producer = {'path': 'scripts/acquire-spec-small-originals.py', 'sha256': sha((ROOT / 'scripts/acquire-spec-small-originals.py').read_bytes())}
    packet = {'schema_version': 1, 'source_inventory': {'path': source_path, 'sha256': sha(raw)},
              'subjects': rows, 'producer': producer, 'source_acquisition_only': True,
              'actual_native_packed_or_floor_qualified': False, 'g11_claim': 'not-passed'}
    record = {'schema_version': 1, 'producer': producer, 'subjects': SUBJECTS, 'members': acquisitions,
              'private_temporary_object_view_removed': True, 'shared_cache_written': False,
              'upstream_or_candidate_source_executed': False, 'credentials_used_or_changed': False,
              'source_review_complete': False, 'actual_native_packed_or_floor_qualified': False, 'g11_claim': 'not-passed'}
    for destination, value in [(args.out, packet), (args.acquisition, record)]:
        with destination.open('xb') as output:
            output.write(gzip.compress((json.dumps(value, indent=2) + '\n').encode(), mtime=0))


if __name__ == '__main__':
    main()
