# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Freshly validate live successors before reading finite historical task members."""
import hashlib
import json
from pathlib import Path
import subprocess


def historical_source_members(root, read_current=None):
    root = Path(root)
    child = subprocess.run(['node', 'scripts/tab-portal-source-context.mjs', '--parent'],
                           cwd=root, capture_output=True, text=True, timeout=90)
    if child.returncode:
        raise AssertionError((child.stdout + child.stderr)[-14000:])
    result = json.loads(child.stdout)
    assert result['raw_current_checked'] is True
    assert len(result['members']) == 17
    for member in result['current_fingerprints']:
        raw = (read_current(member['path']) if read_current else
               historical_member_bytes(root, member['path'], {}))
        assert hashlib.sha256(raw).hexdigest() == member['sha256'], member['path']
    members = {}
    for member in result['members']:
        assert member['path'] not in members
        raw = member['text'].encode()
        assert hashlib.sha256(raw).hexdigest() == member['sha256']
        members[member['path']] = raw
    return members


def historical_member_bytes(root, path, members, read_current=None):
    if path in members:
        return members[path]
    if read_current:
        return read_current(path)
    member = Path(root)
    for part in path.split('/'):
        assert part and part not in {'.', '..'}
        member = member/part
        assert not member.is_symlink()
    return member.read_bytes()
