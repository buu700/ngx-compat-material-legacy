# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite v4 product successor for current source owners; Git bytes are comparison data only."""
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

SELF = 'scripts/select_dialog_finite_source_successor_v4.py'
PACKETS = (
    ('compatibility/rc/parent-select-dialog-finite-source-v1.json', 'fe029afba0dbf7b1d9ecf51661cdc98240b6b0c2ee70a352dfdf99fd48ce27a6', 17132),
    ('compatibility/rc/parent-select-dialog-menu-finite-source-v2.json', '67f279d9631a48a4cf69ef41c3ae4c3ab3446bca457d023b7e22e323506c6d88', 34319),
    ('compatibility/rc/parent-select-dialog-menu-snack-finite-source-v3.json', 'bb2be03706f10cc22029facdb916d3527bf40cef120f0746d4ddd8794371159d', 49370),
    ('compatibility/rc/parent-select-dialog-menu-snack-d61-menu-finite-source-v4.json', 'f8f9423c7dff2ffd5ee72fa812f137bb5db8e59a4b88b7c1868086e3bdb28777', 112277),
)
PATHS = (
    'projects/ngx-material-legacy/legacy-select/select.html',
    'projects/ngx-material-legacy/legacy-select/select.spec.ts',
    'projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.ts',
    'projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts',
    'projects/ngx-material-legacy/legacy-menu/menu.spec.ts',
    'projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.ts',
    'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-base.ts',
    'projects/ngx-material-legacy/legacy-snack-bar/snack-bar.spec.ts',
)
LATEST = (
    'projects/ngx-material-legacy/legacy-dialog/internal/dialog-base.ts',
    'projects/ngx-material-legacy/legacy-dialog/dialog.spec.ts',
    'projects/ngx-material-legacy/legacy-menu/internal/menu-trigger-base.ts',
    'projects/ngx-material-legacy/legacy-menu/menu.spec.ts',
)
_IMAGE = (Path(__file__).resolve().parents[1] / SELF).read_bytes()


def _hash(raw):
    return hashlib.sha256(raw).hexdigest()


def _ref(path, raw):
    return dict(path=path, sha256=_hash(raw), bytes=len(raw))


def _path(path):
    assert type(path) is str and path and not path.startswith('/') and '\\' not in path and '\0' not in path
    assert all(part and part not in ('.', '..') for part in path.split('/'))
    return path


def _physical(root, path):
    cursor = root
    for part in _path(path).split('/'):
        cursor = cursor / part
        assert not cursor.is_symlink(), 'linked product source ' + path
    assert cursor.is_file(), 'missing product source ' + path
    return cursor.read_bytes()


def _blob(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()


def _historical(root, parent, path):
    assert re.fullmatch('[0-9a-f]{40}', parent)
    env = {k: v for k, v in os.environ.items() if not k.startswith('GIT_')}
    env.update(GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1', GIT_TERMINAL_PROMPT='0')
    return subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
                                    'show', parent + ':' + _path(path)], cwd=root, env=env, stderr=subprocess.PIPE)


class SelectDialogFiniteSourceV4:
    """Authenticate v1-v4 exact edits and expose current references, never old product bytes."""
    def __init__(self, root, *, read=None, line=None):
        if not __debug__:
            raise RuntimeError('optimized Python cannot authenticate finite source')
        root = Path(root).absolute()
        assert root.is_dir() and not root.is_symlink()
        assert read is None or callable(read)
        version = json.loads(_physical(root, 'projects/ngx-material-legacy/package.json'))['version']
        actual_line = '21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None
        assert actual_line in ('21.x', 'main') and (line is None or line == actual_line)
        assert _physical(root, SELF) == _IMAGE, 'changed loaded v4 successor'
        packets, bound = [], [_ref(SELF, _IMAGE)]
        for path, digest, size in PACKETS:
            raw = _physical(root, path)
            assert (_hash(raw), len(raw)) == (digest, size), 'changed successor packet ' + path
            packets.append(json.loads(raw))
            bound.append(dict(path=path, sha256=digest, bytes=size))
        older, old, preceding, packet = packets
        assert all(row['schema_version'] == 1 for row in packets)
        assert [row['role'] for row in packets] == [
            'finite-select-dialog-current-source-successor',
            'finite-select-dialog-menu-current-source-successor',
            'finite-select-dialog-menu-snack-current-source-successor',
            'finite-select-dialog-menu-snack-d61-menu-current-source-successor']
        for index in (1, 2, 3):
            path, digest, size = PACKETS[index - 1]
            assert packets[index]['previous_packet'] == dict(path=path, sha256=digest, bytes=size)
        assert packet['source_scope_only'] is True and packet['historical_programs_executed'] is False
        assert packet['canonical_admission_granted'] is False and packet['g11_claim'] == 'not-passed'
        rows = packet['branches'][actual_line]['transitions']
        latest = packet['branches'][actual_line]['d61_menu_transitions']
        assert [row['path'] for row in rows] == list(PATHS)
        assert rows[:3] == older['branches'][actual_line]['transitions']
        assert rows[:5] == old['branches'][actual_line]['transitions']
        assert rows == preceding['branches'][actual_line]['transitions']
        assert [row['path'] for row in latest] == list(LATEST)
        prior_by_path = {row['path']: row for row in rows}
        for row in latest:
            if row['path'] in prior_by_path:
                assert row['before'] == prior_by_path[row['path']]['after']
        effective = [dict(row, after=next((item['after'] for item in latest if item['path'] == row['path']), row['after'])) for row in rows]
        effective += [row for row in latest if row['path'] not in prior_by_path]
        assert len({row['path'] for row in effective}) == len(effective) == 9
        for row in rows + latest:
            path = row['path']
            assert row['before']['path'] == row['after']['path'] == path
            before = _historical(root, row['source_parent'], path)
            assert _ref(path, before) == {key: row['before'][key] for key in ('path', 'sha256', 'bytes')}
            assert _blob(before) == row['before']['git_blob']
            chunks, cursor = [], 0
            for edit in row['edits']:
                assert set(edit) == {'offset', 'before', 'after'}
                offset, old_bytes = edit['offset'], edit['before'].encode()
                assert type(offset) is int and cursor <= offset <= len(before)
                assert before[offset:offset + len(old_bytes)] == old_bytes
                chunks.extend((before[cursor:offset], edit['after'].encode()))
                cursor = offset + len(old_bytes)
            after = b''.join(chunks) + before[cursor:]
            assert _ref(path, after) == {key: row['after'][key] for key in ('path', 'sha256', 'bytes')}
            assert _blob(after) == row['after']['git_blob']
        for row in effective:
            ref = {key: row['after'][key] for key in ('path', 'sha256', 'bytes')}
            assert _ref(row['path'], _physical(root, row['path'])) == ref, 'changed current product ' + row['path']
            bound.append(ref)
        assert len({ref['path'] for ref in bound}) == len(bound)
        self._root, self._read, self._bound, self._effective, self._latest = root, read, bound, effective, latest
        self._active = False
        self.assert_current()

    @property
    def bound(self):
        return copy.deepcopy(self._bound)

    def assert_physical(self):
        for ref in self._bound:
            assert _ref(ref['path'], _physical(self._root, ref['path'])) == ref, 'changed physical successor ' + ref['path']
        assert _physical(self._root, SELF) == _IMAGE, 'changed loaded v4 successor'

    def assert_current(self):
        assert not self._active, 'reentrant product successor'
        self._active = True
        try:
            self.assert_physical()
            for ref in self._bound:
                before = _physical(self._root, ref['path'])
                assert _ref(ref['path'], before) == ref
                supplied = before if self._read is None else self._read(ref['path'])
                assert type(supplied) is bytes and supplied == before, 'nonphysical successor ' + ref['path']
                assert _physical(self._root, ref['path']) == before, 'successor changed during callback ' + ref['path']
            self.assert_physical()
        finally:
            self._active = False

    def _select(self, incoming, side):
        assert type(incoming) is dict
        path = incoming.get('path')
        row = next((row for row in self._effective if row['path'] == path), None)
        if row is None:
            return None
        assert set(incoming) in ({'path', 'sha256'}, {'path', 'sha256', 'bytes'})
        intermediate = next((item['before'] for item in self._latest if item['path'] == path), None)
        selected = next((ref for ref in (row['before'], intermediate, row['after'])
                         if ref is not None and ref['sha256'] == incoming['sha256']), None)
        assert selected is not None, 'unknown product predecessor ' + path
        assert 'bytes' not in incoming or incoming['bytes'] == selected['bytes']
        self.assert_physical()
        target = row['after' if side == 'after' else 'before']
        return dict(path=path, sha256=target['sha256'], **({'bytes': target['bytes']} if 'bytes' in incoming else {}))

    def qualify(self, incoming):
        return self._select(incoming, 'after')

    def historical_reference(self, incoming):
        return self._select(incoming, 'before')
