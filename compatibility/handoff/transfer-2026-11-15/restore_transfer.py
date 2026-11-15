#!/usr/bin/env python3
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Verify this handoff's payload, optionally copying it into a new directory.

Only regular data files are copied. No patches or payload programs are executed,
no Git metadata is changed, and historical evidence contents remain unchanged.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import stat

EXPECTED_MANIFEST = '37c94162fe6ec115b39c47c75a7c23ddae2f3e284cf72cbd83b8f957204a8dc8'


def require(condition, message):
    if not condition:
        raise SystemExit(message)


def digest_file(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dest', type=Path, help='new durable directory; must not exist')
    args = parser.parse_args()
    package = Path(__file__).resolve().parent
    manifest = package / 'EVIDENCE-SUMMARY.json'
    require(digest_file(manifest) == EXPECTED_MANIFEST, 'Manifest SHA-256 mismatch')
    data = json.loads(manifest.read_text())
    require(data['schema_version'] == 2, 'Unsupported manifest')
    payload = package / 'payload'
    require(payload.is_dir() and not payload.is_symlink(), 'Missing regular payload directory')
    entries = data['entries']
    expected = set()
    for entry in entries:
        name = entry['path']
        require(isinstance(name, str), 'Invalid path type')
        parts = PurePosixPath(name).parts
        require(name and not name.startswith('/') and '\\' not in name
                and '\x00' not in name and parts and ':' not in parts[0]
                and all(part not in {'.', '..'} for part in name.split('/'))
                and PurePosixPath(name).as_posix() == name, 'Unsafe payload path')
        require(name not in expected, 'Duplicate payload path')
        expected.add(name)
    actual = set()
    for path in payload.rglob('*'):
        mode = path.lstat().st_mode
        require(stat.S_ISDIR(mode) or stat.S_ISREG(mode), 'Non-regular payload entry')
        if stat.S_ISREG(mode):
            actual.add(path.relative_to(payload).as_posix())
    require(actual == expected, 'Missing or unexpected payload files')
    for entry in entries:
        path = payload / entry['path']
        require(path.stat().st_size == entry['bytes'] and digest_file(path) == entry['sha256'],
                'Payload mismatch: ' + entry['path'])
    require(len(entries) == data['logical_files']
            and sum(entry['bytes'] for entry in entries) == data['bytes'], 'Manifest totals mismatch')
    packets = json.loads((package / 'PENDING-PACKETS.json').read_text())['packets']
    by_path = {entry['path']: entry for entry in entries}
    for packet in packets:
        entry = by_path.get(packet['payload_path'])
        require(entry is not None and entry['sha256'] == packet['sha256']
                and entry['bytes'] == packet['bytes'], 'Pending packet mismatch: ' + packet['name'])
    print(f"Verified {len(entries)} files, {data['bytes']} bytes, {len(packets)} pending-packet bindings")
    if args.dest is None:
        return
    parent = args.dest.absolute().parent.resolve(strict=True)
    destination = parent / args.dest.name
    require(not destination.exists() and not destination.is_symlink(), 'Destination already exists')
    destination.mkdir(mode=0o700, exist_ok=False)
    for entry in entries:
        target = destination / entry['path']
        target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        with (payload / entry['path']).open('rb') as src, target.open('xb') as out:
            shutil.copyfileobj(src, out)
        target.chmod(0o600)
        require(digest_file(target) == entry['sha256'], 'Restored file mismatch: ' + entry['path'])
    receipt = {'manifest_sha256': EXPECTED_MANIFEST, 'logical_files': len(entries),
               'bytes': data['bytes'], 'destination': str(destination),
               'evidence_rewritten': False, 'patches_applied_or_programs_executed': False}
    (destination / 'TRANSFER-RESTORE.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print('BASE=' + str(destination / 'base'))
    print('Pending work remains unadopted; history import is documented separately in README.md.')


if __name__ == '__main__':
    main()
