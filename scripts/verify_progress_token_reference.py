# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Reauthenticate retained progress token evidence against local tag and archives."""
import argparse
import base64
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[1]
SUBJECT = ROOT / 'compatibility/rc/progress-token-original-minimum-subjects.json'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def require(value, message):
    if not value:
        raise ValueError(message)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--components-git', required=True)
    parser.add_argument('--original-tarball', required=True)
    parser.add_argument('--minimum-tarball', required=True)
    args = parser.parse_args()
    body = SUBJECT.read_bytes()
    require(sha(body) == '633cbc38b7665949f04ee26d244d362c035014718f541b64799458cb5eb9521f', 'subject bytes')
    subject = json.loads(body)
    tag = subprocess.check_output(['git', '--no-replace-objects', '--git-dir', args.components_git,
                                   'rev-parse', '16.2.14^{commit}'], text=True).strip()
    require(tag == subject['original']['commit'] == 'df60e733c60e572ba538f6ad0ceff3e63e527b53', 'tag commit')
    for kind, path in [('original', args.original_tarball), ('minimum', args.minimum_tarball)]:
        archive = Path(path).read_bytes()
        entry = subject[kind]
        require(sha(archive) == entry['archive_sha256'], kind + ' archive hash')
        require('sha512-' + base64.b64encode(hashlib.sha512(archive).digest()).decode() == entry['integrity'], kind + ' archive integrity')
        with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as tar:
            for member in entry['members']:
                raw = tar.extractfile(member['archive_member']).read()
                captured = gzip.decompress(base64.b64decode(member['gzip_base64']))
                require(raw == captured and len(raw) == member['bytes'] and sha(raw) == member['sha256'], member['archive_member'])
                if kind == 'minimum':
                    installed = ROOT / 'node_modules/@angular/material' / member['archive_member'].removeprefix('package/')
                    require(installed.read_bytes() == raw, 'installed minimum ' + member['archive_member'])
            if kind == 'original':
                maps = [json.load(tar.extractfile('package/fesm2022/legacy-progress-bar.mjs.map')),
                        json.load(tar.extractfile('package/fesm2022/progress-bar.mjs.map'))]
                public_api = tar.extractfile('package/esm2022/legacy-progress-bar/public-api.mjs').read().decode()
                match = re.search(r'sourceMappingURL=data:application/json;base64,([^\s]+)', public_api)
                require(match is not None, 'public api source map')
                maps.append(json.loads(base64.b64decode(match.group(1))))
                for source in entry['tag_sources']:
                    exact = subprocess.check_output(['git', '--no-replace-objects', '--git-dir', args.components_git,
                                                     'show', tag + ':' + source['path']])
                    blob = subprocess.check_output(['git', '--no-replace-objects', '--git-dir', args.components_git,
                                                    'rev-parse', tag + ':' + source['path']], text=True).strip()
                    candidates = [text.encode() for item in maps for name, text in zip(item['sources'], item['sourcesContent']) if name.endswith(source['path'])]
                    require(exact == source['source'].encode() and sha(exact) == source['sha256'] and blob == source['git_blob_sha1'] and candidates == [exact], source['path'])
    print(json.dumps({'tag_commit': tag, 'tag_sources': len(subject['original']['tag_sources']),
                      'original_members': len(subject['original']['members']),
                      'minimum_members': len(subject['minimum']['members']),
                      'both_archive_sri_verified': True, 'source_maps_match_git': True,
                      'installed_minimum_matches_archive': True}))


if __name__ == '__main__':
    main()
