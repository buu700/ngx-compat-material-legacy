#!/usr/bin/env python3
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Verify the private evidence payload; optionally restore into a new directory.

This transports data only. It never applies patches, executes payload programs,
rewrites evidence paths, accesses credentials, or changes Git metadata.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import zipfile

EXPECTED_ARCHIVE = '0549c3d0cfacee4e4c3e28c68e9b7abab44fd11add6099a97ac2305b9d7f5a6c'
EXPECTED_INDEX = 'fbc57ab39bcdd5d5967a887061fc7aa75111cff85fc454a9ce11fa274e8bc30e'


def require(condition, message):
    if not condition:
        raise SystemExit(message)


def digest_file(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('--dest', type=Path, help='new private directory; must not exist')
    args = parser.parse_args()
    require(digest_file(args.archive) == EXPECTED_ARCHIVE, 'Archive SHA-256 mismatch')
    with zipfile.ZipFile(args.archive) as z:
        names = z.namelist()
        require(len(names) == len(set(names)), 'Duplicate ZIP members')
        require('index.json' in names, 'Missing index')
        index_bytes = z.read('index.json')
        require(hashlib.sha256(index_bytes).hexdigest() == EXPECTED_INDEX, 'Index SHA-256 mismatch')
        index = json.loads(index_bytes)
        objects = index['objects']
        entries = index['entries']
        require(all(re.fullmatch('[0-9a-f]{64}', h) for h in objects), 'Invalid object name')
        require(set(names) == {'index.json'} | {'objects/' + h for h in objects}, 'Unexpected ZIP members')
        seen = set()
        for entry in entries:
            name = entry['path']
            parts = PurePosixPath(name).parts
            require(isinstance(name, str) and '\\' not in name and '\x00' not in name
                    and not name.startswith('/') and parts and ':' not in parts[0]
                    and all(p not in {'.', '..'} for p in parts), 'Unsafe logical path')
            require(name not in seen, 'Duplicate logical path')
            seen.add(name)
            require(entry['sha256'] in objects and entry['bytes'] == objects[entry['sha256']],
                    'Invalid logical object reference')
        total = 0
        for sha, size in objects.items():
            info = z.getinfo('objects/' + sha)
            require(info.file_size == size and ((info.external_attr >> 16) & 0o170000) == 0o100000,
                    'Invalid object type or size')
            h = hashlib.sha256()
            count = 0
            with z.open(info) as f:
                for chunk in iter(lambda: f.read(1024 * 1024), b''):
                    h.update(chunk)
                    count += len(chunk)
            require(count == size and h.hexdigest() == sha, 'Object content mismatch: ' + sha)
            total += count
        print(f'Verified {len(entries)} logical files, {len(objects)} objects, {total} unique bytes')
        if args.dest is None:
            return
        # Resolve the existing parent once, then write only inside an exclusively
        # created 0700 root. The archive contains no links and cannot overwrite.
        parent = args.dest.absolute().parent.resolve(strict=True)
        destination = parent / args.dest.name
        destination.mkdir(mode=0o700, exist_ok=False)
        for entry in entries:
            path = destination.joinpath(*PurePosixPath(entry['path']).parts)
            path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            with z.open('objects/' + entry['sha256']) as src, path.open('xb') as out:
                for chunk in iter(lambda: src.read(1024 * 1024), b''):
                    out.write(chunk)
            path.chmod(0o700 if entry['mode'] & 0o111 else 0o600)
        record = {'archive_sha256': EXPECTED_ARCHIVE, 'index_sha256': EXPECTED_INDEX,
                  'destination': str(destination), 'logical_files': len(entries),
                  'old_evidence_contents_and_paths_rewritten': False,
                  'patches_applied_or_programs_executed': False}
        (destination / 'TRANSFER-RESTORE.json').write_text(json.dumps(record, indent=2) + '\n')
        print('BASE=' + str(destination / 'base'))
        print('Snapshots are unfinished checkpoints, not approved patches.')


if __name__ == '__main__':
    main()
