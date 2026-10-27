#!/usr/bin/env python3
# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Read exact cached helper contexts; no fetch, repository write or code execution."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
HASH = lambda raw: hashlib.sha256(raw).hexdigest()


def capture(originals, paths, mirror):
    raw = originals.read_bytes(); assert len(raw) <= 16 * 1024 * 1024
    data = json.loads(gzip.decompress(raw)); worksheet = json.loads(data['worksheet_at_capture'])
    assert 0 < len(paths) == len(set(paths)) <= 16
    assert all(isinstance(p, str) and all(v and v not in ('.', '..') for v in p.split('/'))
               and not re.search(r'[\\\x00-\x1f]', p) for p in paths)
    env = {**os.environ, 'GIT_NO_LAZY_FETCH': '1', 'GIT_NO_REPLACE_OBJECTS': '1'}
    for name in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']: env.pop(name, None)
    def git(*args):
        return subprocess.check_output(['git', '--no-replace-objects', '--git-dir=' + str(mirror),
            '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', *args], env=env, timeout=30)
    contexts = []
    for row in data['reviews']:
        assert re.fullmatch('[0-9a-f]{40}', row['sha']) and re.fullmatch('[0-9a-f]{40}', row['parent'])
        for role, commit in [('before', row['parent']), ('after', row['sha'])]:
            for path in paths: contexts.append(dict(review_sha=row['sha'], role=role, commit=commit, path=path))
    for path in paths: contexts.append(dict(review_sha=None, role='tagged16', commit=data['tagged_reference']['commit'], path=path))
    for context in contexts:
        commit, path = context['commit'], context['path']
        listing = git('ls-tree', '-z', commit, '--', path)
        metadata, actual = listing.rstrip(b'\0').split(b'\t'); mode, kind, blob = metadata.decode().split()
        assert actual.decode() == path and mode == '100644' and kind == 'blob'
        body = git('cat-file', 'blob', blob); assert len(body) <= 2 * 1024 * 1024
        assert hashlib.sha1(b'blob ' + str(len(body)).encode() + b'\0' + body).hexdigest() == blob
        context.update(tree_record=listing.decode(), blob=blob, sha256=HASH(body), bytes=len(body), body=body.decode())
    return dict(schema_version=1, role='Cached original helper context only; no review or product qualification',
        originals=dict(path=originals.resolve().relative_to(ROOT).as_posix(), sha256=HASH(raw)), contexts=contexts,
        producer=dict(path='scripts/capture-upstream-review-context.py', sha256=HASH(Path(__file__).read_bytes())),
        project_or_cache_mutations=False, network_used=False, upstream_code_executed=False,
        artifact_prefix=worksheet['artifact_prefix'], g11_claim='not-passed')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--originals', type=Path, required=True)
    parser.add_argument('--path', action='append', required=True)
    parser.add_argument('--mirror', type=Path, default=Path('/home/parallels/.cache/angular-components.git'))
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args(); result = capture(args.originals, args.path, args.mirror)
    assert args.out.resolve().relative_to(ROOT).as_posix().startswith(result['artifact_prefix'])
    with args.out.open('x') as stream: json.dump(result, stream, indent=2); stream.write('\n')
    print(json.dumps(dict(path=args.out.as_posix(), sha256=HASH(args.out.read_bytes()), contexts=len(result['contexts']))))
