# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Read only three complete cached originals; never execute upstream source."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

SUBJECTS = [
    'd5d468a29a2db4c0676c57d60bc8431ed4fd6e18',
    '13629b0cd814ccc5fa01cf670b8b3001bc0021ff',
    'cf868a5089a4c9eaddd4a55fd18b952fb96d5c19',
]


def inspect(repo):
    env = {**os.environ, 'GIT_NO_LAZY_FETCH': '1', 'GIT_NO_REPLACE_OBJECTS': '1'}
    for key in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
        env.pop(key, None)

    def git(*args):
        return subprocess.check_output(['git', '--git-dir', str(repo), '--no-replace-objects',
                                       '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', *args], env=env)

    def object_hash(kind, raw):
        return hashlib.sha1(kind.encode() + b' ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()

    blobs, commits = {}, []
    for sha in SUBJECTS:
        raw_commit = git('cat-file', 'commit', sha)
        assert object_hash('commit', raw_commit) == sha
        parent = re.findall(rb'^parent ([0-9a-f]{40})$', raw_commit, re.M)
        assert len(parent) == 1
        parent = parent[0].decode()
        paths = git('diff', '--name-only', '--no-renames', parent, sha).decode().splitlines()
        assert len(paths) == 2
        assert paths[0] == 'src/material/autocomplete/autocomplete-trigger.ts'
        assert paths[1] == ('tools/public_api_guard/material/autocomplete.md' if sha == SUBJECTS[1]
                            else 'src/material/autocomplete/autocomplete.spec.ts')
        diff = git('diff', '--full-index', '--no-ext-diff', '--no-textconv', '--no-renames', parent, sha)
        members = []
        for path in paths:
            sides = {}
            for side, commit in [('before', parent), ('after', sha)]:
                identity = git('rev-parse', commit + ':' + path).decode().strip()
                raw = git('cat-file', 'blob', identity)
                assert object_hash('blob', raw) == identity
                if identity not in blobs:
                    blobs[identity] = dict(git_blob=identity, bytes=len(raw),
                                           sha256=hashlib.sha256(raw).hexdigest(), text=raw.decode())
                sides[side] = identity
            members.append(dict(path=path, **sides))
        hunks = re.findall(r'^@@.*$', diff.decode(), re.M)
        assert len(hunks) == {SUBJECTS[0]: 2, SUBJECTS[1]: 5, SUBJECTS[2]: 3}[sha]
        commits.append(dict(sha=sha, parent=parent, raw_commit=raw_commit.decode(),
                            diff=diff.decode(), diff_sha256=hashlib.sha256(diff).hexdigest(),
                            original_files=2, original_hunks=len(hunks), members=members))
    assert len(blobs) == 9
    return dict(schema_version=1, role='Authenticated complete original source data, not execution or admission',
                subjects=SUBJECTS, commits=commits, blobs=blobs, unique_blobs=9,
                original_file_occurrences=6, original_hunks=10, upstream_code_executed=False,
                native_artifact_floor_or_G11_qualified=False)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path.home() / '.cache/angular-components.git')
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    result = inspect(args.repo)
    raw = (json.dumps(result, indent=2, ensure_ascii=False) + '\n').encode()
    with args.out.open('xb') as output:
        output.write(gzip.compress(raw, mtime=0))
    print(json.dumps(dict(subjects=3, original_file_occurrences=6, original_hunks=10,
                         unique_blobs=9, upstream_code_executed=False,
                         gzip_sha256=hashlib.sha256(args.out.read_bytes()).hexdigest())))
