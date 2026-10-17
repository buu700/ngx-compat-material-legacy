#!/usr/bin/env python3
# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Capture the complete 149-file global-zoneless commit and their complete finite path sets; execute no source."""
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
REGISTERED_SHAS = ['ad7a14b85f35c5e194685fda2adcb19009c49c02']
_population = (ROOT / 'compatibility/rc/mixed-global-zoneless-source-population.json').read_bytes()
assert hashlib.sha256(_population).hexdigest() == 'e9a30722766401c8c526ed4aae7a05b7da9f21ea66c11bae2e2bb9d476e2629d'
EXACT_SOURCE_MEMBERS = json.loads(_population)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def git_hash(kind, raw):
    return hashlib.sha1(f'{kind} {len(raw)}\0'.encode() + raw).hexdigest()


def select_subjects(worksheet, census):
    """The explicit worksheet, full census and maintained line must agree."""
    assert worksheet.get('schema_version') == 1
    assert worksheet.get('source_population') == {'path': 'compatibility/rc/mixed-global-zoneless-source-population.json', 'sha256': 'e9a30722766401c8c526ed4aae7a05b7da9f21ea66c11bae2e2bb9d476e2629d'}
    assert worksheet.get('original_file_count') == 149
    assert worksheet.get('original_file_status_counts') == {'M': 149}
    assert worksheet.get('line') in ('main', '21.x') and census.get('line') == worksheet['line']
    subjects = worksheet.get('subjects')
    assert subjects == REGISTERED_SHAS, 'reader is bounded to the exact single global-zoneless commit'
    assert isinstance(subjects, list) and 0 < len(subjects) <= 8, 'select one to eight explicit subjects'
    assert all(isinstance(value, str) and re.fullmatch('[0-9a-f]{40}', value) for value in subjects)
    assert len(set(subjects)) == len(subjects), 'duplicate review subject'
    by_sha = {row['sha']: row for row in census['commits']}
    assert len(by_sha) == len(census['commits']) == 1697
    assert all(value in by_sha for value in subjects), 'subject outside the original1697 census'
    selected = [by_sha[value] for value in subjects]
    for row in selected:
        assert len(row['parents']) == 1
        files = row['complete_changed_files']
        assert len(files) == 149 and len({member['path'] for member in files}) == len(files)
        assert files == EXACT_SOURCE_MEMBERS[row['sha']], 'unreviewed complete mixed source population'
        for member in files:
            path = member['path']
            assert isinstance(path, str) and '\\' not in path
            assert path in [n['path'] for n in EXACT_SOURCE_MEMBERS[row['sha']]], 'unreviewed mixed source path'
            assert all(part not in ('', '.', '..') for part in path.split('/'))
            assert not any(ord(char) < 32 for char in path)
            assert member['status'] == 'M' and all(member[side + '_mode'] in ('100644',) for side in ('before', 'after')), 'unreviewed mixed source status or mode'
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
