#!/usr/bin/env python3
# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Capture exactly four mixed documentation/example behavior commits and their complete finite path sets; execute no source."""
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
MIXED_EXAMPLE_DOCS_SHAS = ['487c4537847c68638811063adff7c59d8a5d6f7a', '6875bb6cb8e6bc13c3e480e85b3c93f8e7f28f98', '14d5de1f2f4d262df9c7afd1e1a1677f7886ec85', '7798bb7c64233db5e5d27a192c060ae52fc413d9']
EXACT_SOURCE_PATHS = {'487c4537847c68638811063adff7c59d8a5d6f7a': ['src/components-examples/material/dialog/dialog-animations/dialog-animations-example.ts', 'src/components-examples/material/dialog/dialog-data/dialog-data-example.ts', 'src/components-examples/material/dialog/dialog-elements/dialog-elements-example.ts', 'src/components-examples/material/dialog/dialog-from-menu/dialog-from-menu-example.ts', 'src/components-examples/material/dialog/dialog-harness/dialog-harness-example.spec.ts', 'src/components-examples/material/dialog/dialog-harness/dialog-harness-example.ts', 'src/components-examples/material/dialog/dialog-overview/dialog-overview-example.ts', 'src/dev-app/autocomplete/autocomplete-demo.ts', 'src/dev-app/dialog/dialog-demo.ts', 'src/dev-app/focus-trap/focus-trap-demo.ts', 'src/dev-app/slider/slider-demo.ts', 'src/material/dialog/testing/dialog-harness.spec.ts', 'src/universal-app/kitchen-sink/kitchen-sink.ts'], '6875bb6cb8e6bc13c3e480e85b3c93f8e7f28f98': ['src/components-examples/material-experimental/popover-edit/popover-edit-mat-table/popover-edit-mat-table-example.ts', 'src/components-examples/material/snack-bar/snack-bar-annotated-component/snack-bar-annotated-component-example.ts', 'src/components-examples/material/snack-bar/snack-bar-component/snack-bar-component-example.ts', 'src/components-examples/material/snack-bar/snack-bar-harness/snack-bar-harness-example.spec.ts', 'src/components-examples/material/snack-bar/snack-bar-harness/snack-bar-harness-example.ts', 'src/components-examples/material/snack-bar/snack-bar-overview/snack-bar-overview-example.ts', 'src/components-examples/material/snack-bar/snack-bar-position/snack-bar-position-example.ts', 'src/material/snack-bar/testing/snack-bar-harness.spec.ts', 'src/universal-app/kitchen-sink/kitchen-sink.ts'], '14d5de1f2f4d262df9c7afd1e1a1677f7886ec85': ['src/cdk/dialog/dialog.spec.ts', 'src/components-examples/material/dialog/dialog-animations/dialog-animations-example-dialog.html', 'src/components-examples/material/dialog/dialog-data/dialog-data-example-dialog.html', 'src/components-examples/material/dialog/dialog-elements/dialog-elements-example-dialog.html', 'src/components-examples/material/dialog/dialog-overview/dialog-overview-example-dialog.html', 'src/dev-app/slider/slider-demo.ts', 'src/material/dialog/dialog.spec.ts'], '7798bb7c64233db5e5d27a192c060ae52fc413d9': ['src/components-examples/material/chips/chips-reactive-form/chips-reactive-form-example.html', 'src/components-examples/material/chips/chips-reactive-form/chips-reactive-form-example.ts', 'src/components-examples/material/chips/chips-template-form/chips-template-form-example.html', 'src/components-examples/material/chips/chips-template-form/chips-template-form-example.ts', 'src/material/tooltip/tooltip.spec.ts']}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def git_hash(kind, raw):
    return hashlib.sha1(f'{kind} {len(raw)}\0'.encode() + raw).hexdigest()


def select_subjects(worksheet, census):
    """The explicit worksheet, full census and maintained line must agree."""
    assert worksheet.get('schema_version') == 1
    assert worksheet.get('line') in ('main', '21.x') and census.get('line') == worksheet['line']
    subjects = worksheet.get('subjects')
    assert subjects == MIXED_EXAMPLE_DOCS_SHAS, 'reader is bounded to the exact four mixed documentation/example behavior commits'
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
        assert [member['path'] for member in files] == EXACT_SOURCE_PATHS[row['sha']], 'unreviewed complete mixed source population'
        for member in files:
            path = member['path']
            assert isinstance(path, str) and '\\' not in path
            assert path in EXACT_SOURCE_PATHS[row['sha']], 'unreviewed mixed source path'
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
