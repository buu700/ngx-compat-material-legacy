#!/usr/bin/env python3
# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Capture exactly three mixed strict-test/file-lifecycle commits and their complete finite path sets; execute no source."""
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
MIXED_STRICT_TESTS_SHAS = ['2c88e9ba9f9b037683e166ecf0d825ee7e39a79c', '839dfba8fc3a7bd9f7865a5eeed6aff1155c5d80', '03adcb539967937f1113d3afddf90aa9574f9e0f']
EXACT_SOURCE_MEMBERS = {'2c88e9ba9f9b037683e166ecf0d825ee7e39a79c': [{'path': 'src/material/core/ripple/ripple.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '2f910349e81ad6ffd1d3137c75541c3efaa5f138', 'after_blob': '96019a45fcd8c70d3c07955a0bf20096bcceb5ab'}, {'path': 'src/material/core/ripple/ripple.zone.spec.ts', 'status': 'A', 'before_mode': '000000', 'after_mode': '100644', 'before_blob': '0000000000000000000000000000000000000000', 'after_blob': '3ec711a2536aaac38499e174b8d3e8d40b87f18d'}, {'path': 'src/material/sidenav/drawer.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '495f5f2203f0e5813dd9681199dbcfcd6d892846', 'after_blob': 'c917f06356b8d60020b195f6d8aa56a0e7e9a4ef'}, {'path': 'src/material/sidenav/sidenav.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'd1a7c2801f265e7cafa9483d0f5d39e0cea1500d', 'after_blob': '2d4d9ad28756984c3936c99c76b6cd5be6c8fb98'}, {'path': 'src/material/slide-toggle/slide-toggle.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '2b4a26718723a7fdd941cef6bcf9cc1f56b9d421', 'after_blob': '546d6e656934d2dc7d1fefd2ad7e2a7cbeca90e6'}, {'path': 'src/material/slider/slider.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'a700eea4f76546bafa384f9702e934780189af3d', 'after_blob': 'a722dd24f30dffb4f222c019071dcf1b318a0e41'}, {'path': 'src/material/snack-bar/snack-bar.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'c9b62f52e4553eb212fe1d6f9aa2dde432ac2af9', 'after_blob': 'fc9305db414462dea6423d41db7e4ecd6020d62d'}, {'path': 'src/material/snack-bar/snack-bar.zone.spec.ts', 'status': 'A', 'before_mode': '000000', 'after_mode': '100644', 'before_blob': '0000000000000000000000000000000000000000', 'after_blob': '3f26f168f708891ee4234f4c1e9b77bf76168446'}, {'path': 'src/material/sort/sort.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '008a5406d03ab271239f16164ab3da0ebd9894e0', 'after_blob': 'ba170e422b9196a523399aa610b13cde5b8cfaad'}, {'path': 'src/material/tooltip/tooltip.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '65be8d7a8a1ee295764655a8e10097d7977d8a11', 'after_blob': 'b61eb94799820099d385866db57db23bfd874397'}, {'path': 'src/material/tooltip/tooltip.zone.spec.ts', 'status': 'A', 'before_mode': '000000', 'after_mode': '100644', 'before_blob': '0000000000000000000000000000000000000000', 'after_blob': 'bc3b7d0edaca06899cabef2515e69a560e24513e'}, {'path': 'tslint.json', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'ee66cbd96d369abba6f9dfc92370b6b756a161a9', 'after_blob': 'c5eef598c56031695457de0bd5d54b69c1ec6550'}], '839dfba8fc3a7bd9f7865a5eeed6aff1155c5d80': [{'path': 'src/cdk-experimental/scrolling/virtual-scroll-viewport.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'e0aa8068ac75ac220c5d025fda78741f2e583515', 'after_blob': '73ad62b93ce2fca9e12efd39a0a80a8b74738293'}, {'path': 'src/components-examples/material/checkbox/checkbox-harness/checkbox-harness-example.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'a1d93372507185fa107c49faf5ec5708fd94696f', 'after_blob': 'e09cd3bc6b5a2f6a79b96dabee3c8c37902a38d5'}, {'path': 'src/material/button-toggle/button-toggle.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '3c37aa3f1008ba12cae8d4f423b547545bccac3b', 'after_blob': '643541356e1b3cfc97b57dab6087bb8142942577'}, {'path': 'src/material/checkbox/testing/checkbox-harness.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'bcd2f57fd4c9a35a9688f1a88ba44453ba05b98c', 'after_blob': '23944e61ac94f7eba777662f9b654920036dd4f8'}, {'path': 'src/material/datepicker/calendar.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '7ec08bdf71b151303f80bf22e10ce650c3c4efcc', 'after_blob': 'f9a4244f20df2b306d7826f78a93c8944f64913a'}, {'path': 'src/material/datepicker/date-range-input.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'e1a1f7d583624783978bafeb7f3087ef363706db', 'after_blob': '169ce44f530455af842aacf6433c504d2356805e'}, {'path': 'src/material/expansion/accordion.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '1cb2987d6c6b245289a9a8ed9a9410b107740d02', 'after_blob': '10445635c270c0ce51c2cd1fe249e97404dac9fe'}, {'path': 'src/material/list/selection-list.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '2afcc06ef32b7d4553e97b05a60b71d0b214c068', 'after_blob': '911dd94d077db501b4c355dc37e8819641e07aa8'}, {'path': 'src/material/menu/menu.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'cebabbc76fcb50e5ecb0812606773d58b7740876', 'after_blob': 'cce50535ab93a905b23acd1a70a63bb65a49d1be'}, {'path': 'src/material/radio/radio.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '0d2e0ccb5af46b02f5353d6ab3c420a2a2b7a392', 'after_blob': '94f5f98d422f2a1e661cd4baaf1fc5712c0347e2'}, {'path': 'src/material/select/select.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '1c30d8cfe89aeb7b8092cb70c0e6dc5b1ad98e0f', 'after_blob': 'ca6545b198a4f4dede570a0c20161fdcf21f1ef6'}, {'path': 'src/material/sidenav/drawer.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'd02766ae3ea6a4e56ac629f519686d74bd60c692', 'after_blob': '1499ef71bcdeab162a8c3f636c4511e0221ff99e'}, {'path': 'src/material/sidenav/sidenav.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'f711e135e42f81d0f65171223f52239843f2ce3a', 'after_blob': '39cced481ce2d5906100902dbf2adefc2c678d51'}, {'path': 'src/material/sidenav/testing/sidenav-harness.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'abe8d3ac42766a88fc379e6610b021fa8d089c46', 'after_blob': '08b0a54916b1de6b07ca22848e6e7f3a9e0c9f5f'}, {'path': 'src/material/stepper/stepper.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '959e36d93a3ef5589ba3e3ad5fc8991de6965245', 'after_blob': 'efc39d23777742680269bdd020b7f66e6b70c5c2'}, {'path': 'src/material/tabs/tab-nav-bar/tab-nav-bar.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'd23b685fcfacb3e8bcada49423a46c6090400578', 'after_blob': '51a076042151730e2af1298ca0cc2a89cd5177f3'}, {'path': 'test/angular-test.init.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '8b22fd63a2a2e2dd869d207f43ca37e9ff4086d6', 'after_blob': '79ec9117b0cd28007f1028a8eda3062979803f48'}], '03adcb539967937f1113d3afddf90aa9574f9e0f': [{'path': 'src/cdk/a11y/aria-describer/aria-describer.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '739f8e605e8712c8c76e9f8b7325aa99e52e8030', 'after_blob': 'd3f73167b10e806e37c2a3c753df04e7d44fec06'}, {'path': 'src/cdk/a11y/focus-monitor/focus-monitor.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'e2cc98c050105dd5b180bd702ed7bdab0110d95e', 'after_blob': 'ee2955d28b1f7cd6289a056f1af7c3fe82d66ae9'}, {'path': 'src/cdk/a11y/focus-trap/focus-trap.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '428ca86c3337a610f3cefbc8fce65e9f63cc6ac0', 'after_blob': '6760eba821a6c5d94b2be50ca0121bae837d4323'}, {'path': 'src/cdk/accordion/accordion.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '024fe4f3ad01e7b71ab9968678f30941d0b94468', 'after_blob': 'fe0381eca8034032da66652c5f03f91ec33ed672'}, {'path': 'src/cdk/dialog/dialog.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '1f9e65b3b891a0a1f1954343310a492c3dbb5cef', 'after_blob': '1d67421c468fa5b318753aff03bca1132547ef8f'}, {'path': 'src/cdk/menu/menu-group.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '46bfecb48f80a3bd15b1487b7e4e4c8fb6fbf335', 'after_blob': '2b41d725fe117a0dadf931ab8181ac746a964249'}, {'path': 'src/cdk/overlay/fullscreen-overlay-container.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '3ee762da3665c644881c9f6c62cdd636a30ef4b9', 'after_blob': '2622a904da87e2f6334f4a2604f36039047d747b'}, {'path': 'src/cdk/overlay/overlay-container.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '04af6b0691c7f60bd806a064f2e3718f72071030', 'after_blob': '0ac658aa18ef4d80cbb2fb11a969802645c06205'}, {'path': 'src/cdk/overlay/overlay-directives.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'ef11a388e13a4709dad41b422e045ae57847860e', 'after_blob': 'c704b29dc700e0a0d6661e453c973d990c3c1fa7'}, {'path': 'src/cdk/overlay/overlay-directives.zone.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '53907bac554d84a747868fa35fc39a3cbda6a3bf', 'after_blob': '8c2e792aed2fb2145458137df75a88005888dc66'}, {'path': 'src/cdk/overlay/overlay.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'c2c0ac0aebd58c944f8976e0187f68f6d2ca2a53', 'after_blob': '3a529b2051ab47451e43063ba69ff0e1a00ad298'}, {'path': 'src/cdk/portal/portal.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '8726f014d4f02d216d92fbd62f74daf0327eb7aa', 'after_blob': 'c7159875b4b792dc558bd6b281dc506307802b5b'}, {'path': 'src/cdk/scrolling/scroll-dispatcher.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '6d980e639d9c41d8ef520380cdb9bd46d364bb01', 'after_blob': 'eca90f19a365d2580bccc122a338fb381a9af2e1'}, {'path': 'src/cdk/scrolling/scroll-dispatcher.zone.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'cff6030c2c9672f97cbf9203fac3937483a18087', 'after_blob': '676c5155990dcf907196d33837868540557e0061'}, {'path': 'src/cdk/scrolling/scrollable.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '7cc6ec4b4573207b56a5c39296cd117da761f832', 'after_blob': '950d3a347e52e9146f2f9a8b5ee72a32eb870466'}, {'path': 'src/cdk/scrolling/virtual-scroll-viewport.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '473651317913536008ab857c780a69d1e2c6d85a', 'after_blob': 'bfbb970cbd21d08ee53ab5c91abf050aaf00387d'}, {'path': 'src/cdk/scrolling/virtual-scroll-viewport.zone.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'ff61318b4c202d916441f428862387e6bb117529', 'after_blob': 'a36ca5b5494ccbc88baacc98ab9989dd3397ae7f'}, {'path': 'src/cdk/testing/tests/test-main-component.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '243c423bb09d3128029470db257f8e450ebcf7a3', 'after_blob': '502bcbec391298801749e836079b50a90f110a78'}, {'path': 'src/cdk/text-field/autofill.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': '1c91d44d0e41ccb5d2f472af5dddaf4f23446baf', 'after_blob': 'b8f0e94cceccf5bf14327ca375fe4f44996f6514'}, {'path': 'src/cdk/text-field/autosize.spec.ts', 'status': 'M', 'before_mode': '100644', 'after_mode': '100644', 'before_blob': 'd469b4ab001279ddd0cf975c9b2d185c6adc38d6', 'after_blob': '4181fdd50f552b692a544eaa87bed27e2e653639'}]}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def git_hash(kind, raw):
    return hashlib.sha1(f'{kind} {len(raw)}\0'.encode() + raw).hexdigest()


def select_subjects(worksheet, census):
    """The explicit worksheet, full census and maintained line must agree."""
    assert worksheet.get('schema_version') == 1
    assert worksheet.get('line') in ('main', '21.x') and census.get('line') == worksheet['line']
    subjects = worksheet.get('subjects')
    assert subjects == MIXED_STRICT_TESTS_SHAS, 'reader is bounded to the exact three mixed strict-test/file-lifecycle commits'
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
