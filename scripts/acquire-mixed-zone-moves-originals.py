#!/usr/bin/env python3
# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Capture exactly four mixed zone/test/file-lifecycle commits and their complete finite path sets; execute no source."""
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
MIXED_ZONE_MOVES_SHAS = ['d38798a474278c3d4b1533ae3ad7273786be9372', '16d946e7ef8a0908d3b3b65820f757f832b7d646', '04d3b63de2fb843beb55836e39e930c3342d26f1', 'df8adda2164bdf5ef10a0d15225d2b22209f3df4']
EXACT_SOURCE_MEMBERS = {'d38798a474278c3d4b1533ae3ad7273786be9372': [{'path': 'src/cdk/testing/private/mock-ng-zone.ts', 'status': 'D', 'before_mode': '100644', 'after_mode': '000000', 'before_blob': '5fa5ff1d072a260f0faa4aa1eb670d9cdfd2bc61', 'after_blob': '0000000000000000000000000000000000000000'}, {'path': 'src/cdk/testing/private/public-api.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '8474b1560a5ef70bdefa3bca0442345a5c35e40f', 'after_blob': '65555053d1ec2d80c583d3a0f1916b9908e50cb5'}, {'path': 'src/material/chips/chip-grid.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'fcfeeff6122ce8ed5c5f23dc195fa49ac5b850b6', 'after_blob': '4f4a34f8f43f6b434e6edd2d54c5d6ccf4e810db'}, {'path': 'src/material/chips/chip-listbox.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '3adc9c01a5abac6c6bf5098f8f3fc5a1bdbe12d8', 'after_blob': 'a0a41f7614d57ca3441b56a8710a72e26992814c'}, {'path': 'tslint.json', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '91f25693a713c63acd0310035db753b1b377d77e', 'after_blob': 'a31110447e38d2bb7b69eb390568bfdc177d4a54'}, {'path': 'yarn.lock', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '2e1b0ad891964cc02023ac815a4ddc968e14f71d', 'after_blob': 'ef6f88fa3633e4ce1b5b48b2f6893cbfb1d0b55f'}], '16d946e7ef8a0908d3b3b65820f757f832b7d646': [{'path': 'src/cdk/overlay/dispatchers/overlay-keyboard-dispatcher.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'c239266135cc9b43e0cdb9d24c2674cb87c3445d', 'after_blob': '7a103af0b6b600be07b3d4174459d7703a5284c6'}, {'path': 'tslint.json', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'a31110447e38d2bb7b69eb390568bfdc177d4a54', 'after_blob': '9f46ae5744a1b375c4664cd28580a230ce70ec07'}], '04d3b63de2fb843beb55836e39e930c3342d26f1': [{'path': 'src/cdk/a11y/focus-trap/focus-trap.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '8af57b940bd1ff0c2a9eeaf675c0e74370ae4955', 'after_blob': 'a0d3b07df439de817b60280c2d821092cee8b0ea'}, {'path': 'src/cdk/menu/menu-base.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '4af909003931a9951370147968ae76a4b66b35e9', 'after_blob': '031e323abec30c17019c4e09280cbe38810617d1'}, {'path': 'src/cdk/menu/menu-trigger.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '00f0a902171af685bd9b9e7629585d3d15286e9b', 'after_blob': 'a7a681d236e30e358053ec98c4167c9e6c56eace'}, {'path': 'src/cdk/menu/menu.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '122d8bef7795b4b957dc98bb0180162945024e55', 'after_blob': 'ce117ca6bf62ef9f0f2d1828f581b5e956b0222e'}, {'path': 'src/cdk/table/table.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '247163a324e1b56e723b7faf3ca0682b26f3059d', 'after_blob': '41b3cb86254f517ce236684acf004b08ec91082a'}, {'path': 'src/cdk/table/text-column.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '9d0f06f89ae75ca30569fbfaeac54520c99b7bcb', 'after_blob': '3bdd9616204fe18b522e105dfbafedf3a9bbc7f7'}, {'path': 'src/cdk/text-field/autofill.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '2268559e1ac4f6034f6fa7743b3dfcf56de535ea', 'after_blob': '6f14e907430c2fac74a2d02235c4fd094ca608ee'}, {'path': 'src/cdk/text-field/autofill.zone.spec.ts', 'status': 'A', 'before_mode': '000000', 'after_mode': '100644', 'before_blob': '0000000000000000000000000000000000000000', 'after_blob': '5efa4704cca551621a763b8ec6805377e868bcc8'}, {'path': 'src/cdk/text-field/autosize.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '7338b5dc5faa62e777541ad58c1341a3c35d255d', 'after_blob': 'ad3b159484d9d497c1916d36bd1d235d26810f47'}, {'path': 'src/cdk/tree/tree.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '2e21b1bb1a6223704f09fdfd40fbf47400a85f6a', 'after_blob': 'db8d9eedbb1518829145ffcefc1e44de034a10fe'}, {'path': 'src/cdk/tree/tree.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '2b1ee04a1772662e629dce2432df3886b03e0f2b', 'after_blob': '9746981bdf4f6065cb41115886dadc5abe63dadd'}], 'df8adda2164bdf5ef10a0d15225d2b22209f3df4': [{'path': 'src/cdk/scrolling/scroll-dispatcher.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '228b21b6c428aa9317b5ebfbceb04d971468bce5', 'after_blob': 'd46f649d366ff8a87a0e5b534d0e19cbeb883381'}, {'path': 'src/cdk/scrolling/scroll-dispatcher.zone.spec.ts', 'status': 'A', 'before_mode': '000000', 'after_mode': '100644', 'before_blob': '0000000000000000000000000000000000000000', 'after_blob': 'b50d0a6a50993818cac333b53b418a6c99af92f3'}, {'path': 'src/cdk/scrolling/viewport-ruler.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '78a87f351dd9f1727a377aabe42d87af50d8b6e3', 'after_blob': '1b33803e9c165c93e4784591b51798d6dd009e3f'}, {'path': 'src/cdk/scrolling/viewport-ruler.zone.spec.ts', 'status': 'A', 'before_mode': '000000', 'after_mode': '100644', 'before_blob': '0000000000000000000000000000000000000000', 'after_blob': 'ef68ae5de9c58118c08dfdb8319a690050de328c'}, {'path': 'src/cdk/text-field/autofill.zone.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '5efa4704cca551621a763b8ec6805377e868bcc8', 'after_blob': '31a8d5a87b3e39d11148fb48a751f09deffde1fa'}, {'path': 'src/dev-app/main.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '19e8d61e4d6f22f9bc78407fbe67d768400419ba', 'after_blob': '4766971d7769b95abcd944e2c0723e9695b96a96'}, {'path': 'src/material-experimental/popover-edit/popover-edit.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'a66e632b9906eae1f6dd19299bf793b7c3b1180e', 'after_blob': '070c3edc673dbeb952dd82a41eb563ed63964092'}, {'path': 'tools/tslint-rules/noZoneDependenciesRule.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'a3e888cba2b43b33eab2e5a21a49779f13e05a48', 'after_blob': '5f050b9a198c3489703ee1478dbf95cdc06a082c'}, {'path': 'tslint.json', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '0bbce003ac8f0c81e2cf39164d0b478120db9f94', 'after_blob': 'ee66cbd96d369abba6f9dfc92370b6b756a161a9'}]}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def git_hash(kind, raw):
    return hashlib.sha1(f'{kind} {len(raw)}\0'.encode() + raw).hexdigest()


def select_subjects(worksheet, census):
    """The explicit worksheet, full census and maintained line must agree."""
    assert worksheet.get('schema_version') == 1
    assert worksheet.get('line') in ('main', '21.x') and census.get('line') == worksheet['line']
    subjects = worksheet.get('subjects')
    assert subjects == MIXED_ZONE_MOVES_SHAS, 'reader is bounded to the exact four mixed zone/test/file-lifecycle commits'
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
            assert member['status'] in ('M', 'A', 'D') and all(member[side + '_mode'] in ('000000', '100644') for side in ('before', 'after')), 'unreviewed mixed source status or mode'
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
