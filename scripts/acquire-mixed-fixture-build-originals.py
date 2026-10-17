#!/usr/bin/env python3
# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Capture exactly four mixed fixture/build commits and their complete finite path sets; execute no source."""
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
MIXED_FIXTURE_BUILD_SHAS = ['a0eb8b06917b6fc83e13578a8a7358e008844c6f', 'dc3bfc34ebc4ef733a7fedfe341efc0b5e25c4d7', '544257ad0f58e70688abe0d80eccaa73d25ba5d8', '2b82d638c90df83d44613b81c2eeeab24821e8b2']
EXACT_SOURCE_MEMBERS = {'a0eb8b06917b6fc83e13578a8a7358e008844c6f': [{'path': 'package.json', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'f45df62abe7394020a72aed1c7e7051709fb248c', 'after_blob': '54f9fec63e6ca00c3e2d5e85d1fb48f62f936a74'}, {'path': 'src/cdk/portal/portal.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '202f17a0a8a77331dafdab987efcabaaca0c4c4a', 'after_blob': 'e30197d4b78a2171844bf7cb85378ea6e1ce60c5'}, {'path': 'yarn.lock', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '56334fff5cb5b75155c9152e7bb42b5621be18d4', 'after_blob': '36c886305d16e06ef60167fc7992293083ab9746'}], 'dc3bfc34ebc4ef733a7fedfe341efc0b5e25c4d7': [{'path': 'src/cdk/table/table.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'e7604ccd9c0b51c7f12ed82f0556813cd2dd788a', 'after_blob': '08b7928386943c8423ccccaf9a1981dfa05623b5'}, {'path': 'tslint.json', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'a4b39f1a8481f06387b60f0c83e493cab32327ab', 'after_blob': '156971b3c5e4fd4304cc20b4124635896dc7a867'}], '544257ad0f58e70688abe0d80eccaa73d25ba5d8': [{'path': 'guides/using-component-harnesses.md', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'f763722e190d5984cdd26698b0bd68a0a3c1b043', 'after_blob': '1999b710a69c554a4f5ea70afc7edb4104b382d2'}, {'path': 'src/cdk-experimental/accordion/accordion.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'e7700c6de7b12ef6cf2c3e1bccf5c439f536dc36', 'after_blob': '60f721d72ee166a7599e0f290aa2be9fa48d217e'}, {'path': 'src/cdk-experimental/listbox/listbox.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '1a5ce3d785b69d8b5553cd457310de3e0f00424a', 'after_blob': '0d89b5705c17600bd86af6f3428c2c226cfc6a3f'}, {'path': 'src/cdk-experimental/radio/radio.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'cf7300521dabd65d0ea09616e5536773b941de2a', 'after_blob': '639962e8588955ea93ad45eb7b423ae3ee261fbc'}, {'path': 'src/cdk/overlay/overlay.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '8d6740c1e254e9a0ac21b63fa8439114f606afed', 'after_blob': 'b63cefa746ef1d956a9ed5c46ae22626c52d10bd'}], '2b82d638c90df83d44613b81c2eeeab24821e8b2': [{'path': 'goldens/material/chips/index.api.md', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '03eaadd8b43d1421084c46768aab545c9ffa9f8a', 'after_blob': 'bc2fceff84cb096ea41792d9d4e6efe4b2ef4a45'}, {'path': 'src/material/chips/chip-grid.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '2fae033dcc220697a7fffab6ffbcee6892c8bcf2', 'after_blob': 'ba85583bb7b4c6129220f71d030ae6526a3658b4'}]}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def git_hash(kind, raw):
    return hashlib.sha1(f'{kind} {len(raw)}\0'.encode() + raw).hexdigest()


def select_subjects(worksheet, census):
    """The explicit worksheet, full census and maintained line must agree."""
    assert worksheet.get('schema_version') == 1
    assert worksheet.get('line') in ('main', '21.x') and census.get('line') == worksheet['line']
    subjects = worksheet.get('subjects')
    assert subjects == MIXED_FIXTURE_BUILD_SHAS, 'reader is bounded to the exact four mixed fixture/build commits'
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
        assert 0 < len(files) <= 64 and len({member['path'] for member in files}) == len(files)
        assert files == EXACT_SOURCE_MEMBERS[row['sha']], 'unreviewed complete mixed source population'
        for member in files:
            path = member['path']
            assert isinstance(path, str) and '\\' not in path
            assert path in [n['path'] for n in EXACT_SOURCE_MEMBERS[row['sha']]], 'unreviewed mixed source path'
            assert all(part not in ('', '.', '..') for part in path.split('/'))
            assert not any(ord(char) < 32 for char in path)
            assert member['status'] == 'M' and member['before_mode'] == member['after_mode'] == '100644', 'unreviewed mixed source status or mode'
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
