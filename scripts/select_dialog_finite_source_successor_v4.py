# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite v1-v5 product successor for current source owners; Git bytes are comparison data only."""
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
RESTORED = ('compatibility/rc/parent-restored-select-dialog-test-source-v5.json',
            'da132dcf22e68076a4378f5ed2bc3b67cfb4705764107530b40cfb6734b79186', 17761)
TESTS = ('projects/ngx-material-legacy/legacy-select/select.spec.ts',
         'projects/ngx-material-legacy/legacy-dialog/dialog.spec.ts')
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


def _replay(row, before):
    path = row['path']
    assert row['before']['path'] == row['after']['path'] == path
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
    return after


class SelectDialogFiniteSourceV4:
    """Authenticate v1-v5 exact edits and expose current references, never old product bytes."""
    def __init__(self, root, *, read=None, line=None):
        if not __debug__:
            raise RuntimeError('optimized Python cannot authenticate finite source')
        root = Path(root).absolute()
        assert root.is_dir() and not root.is_symlink()
        assert read is None or callable(read)
        package_path = 'projects/ngx-material-legacy/package.json'
        package_raw = _physical(root, package_path)
        version = json.loads(package_raw)['version']
        actual_line = '21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None
        assert actual_line in ('21.x', 'main') and (line is None or line == actual_line)
        assert _physical(root, SELF) == _IMAGE, 'changed loaded v4 successor'
        packets, bound = [], [_ref(SELF, _IMAGE), _ref(package_path, package_raw)]
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
        rendered = {row['path']: _replay(row, _historical(root, row['source_parent'], row['path']))
                    for row in rows + latest}
        intermediates = [row['before'] for row in latest]
        # Only frozen v4 or the complete paired reviewed test restorations qualify.
        if any(_hash(_physical(root, path)) != next(row['after']['sha256'] for row in effective
                                                  if row['path'] == path) for path in TESTS):
            path, digest, size = RESTORED
            raw = _physical(root, path)
            assert (_hash(raw), len(raw)) == (digest, size), 'changed restored-test packet'
            restored = json.loads(raw)
            bound.append(dict(path=path, sha256=digest, bytes=size))
            assert restored['schema_version'] == 1
            assert restored['role'] == 'finite-restored-select-dialog-test-source-v5'
            assert restored['source_scope_only'] is True
            assert restored['historical_programs_executed'] is False
            assert restored['canonical_admission_granted'] is False and restored['g11_claim'] == 'not-passed'
            path, digest, size = PACKETS[-1]
            assert restored['prior_packet'] == dict(path=path, sha256=digest, bytes=size)
            branch = restored['branches'][actual_line]
            assert [row['path'] for row in branch['repairs']] == list(TESTS)
            for row in branch['repairs']:
                prior = next(item for item in effective if item['path'] == row['path'])
                assert row['before'] == prior['after']
                after = _replay(row, rendered[row['path']])
                assert after == _historical(root, row['after_source_parent'], row['path']), 'restored test Git source mismatch'
                intermediates.append(prior['after'])
                prior['after'] = row['after']
            assert [row['path'] for row in branch['receipts']] == [
                'compatibility/rc/parent-input-select-historical-repair-v1.json',
                'compatibility/rc/parent-four-historical-fixture-repairs-v1.json']
            receipts = []
            for item in branch['receipts']:
                raw = _physical(root, item['path'])
                assert _ref(item['path'], raw) == item, 'changed restoration receipt'
                bound.append(dict(item))
                receipts.append(json.loads(raw))
            key = '21' if actual_line == '21.x' else 'main'
            original = receipts[0]['proposal_manifest']['lines'][key]
            assert original['original_spec_sha256']['select'] == branch['repairs'][0]['before']['sha256']
            assert original['patched_spec_sha256']['select'] == branch['repairs'][0]['after']['sha256']
            assert receipts[1]['source_afterimages'][key][TESTS[1]] == branch['repairs'][1]['after']['sha256']
        for row in effective:
            ref = {key: row['after'][key] for key in ('path', 'sha256', 'bytes')}
            assert _ref(row['path'], _physical(root, row['path'])) == ref, 'changed current product ' + row['path']
            bound.append(ref)
        assert len({ref['path'] for ref in bound}) == len(bound)
        self._root, self._read, self._bound, self._effective, self._intermediates = root, read, bound, effective, intermediates
        self._active = self._nested_attempt = False
        self.assert_current()

    @property
    def bound(self):
        return copy.deepcopy(self._bound)

    def _idle(self):
        if self._active:
            self._nested_attempt = True
            raise AssertionError('reentrant product successor')

    def assert_physical(self):
        self._idle()
        self._sweep()

    def _sweep(self):
        for ref in self._bound:
            assert _ref(ref['path'], _physical(self._root, ref['path'])) == ref, 'changed physical successor ' + ref['path']
        assert _physical(self._root, SELF) == _IMAGE, 'changed loaded v4 successor'

    def assert_current(self):
        self._idle()
        self._active = True
        self._nested_attempt = False
        try:
            self._sweep()
            for ref in self._bound:
                before = _physical(self._root, ref['path'])
                assert _ref(ref['path'], before) == ref
                supplied = before if self._read is None else self._read(ref['path'])
                assert type(supplied) is bytes and supplied == before, 'nonphysical successor ' + ref['path']
                assert _physical(self._root, ref['path']) == before, 'successor changed during callback ' + ref['path']
            assert not self._nested_attempt, 'reentrant product successor'
            self._sweep()
        finally:
            self._active = False

    def _select(self, incoming, side):
        self._idle()
        self._active = True
        self._nested_attempt = False
        try:
            self._sweep()
            assert type(incoming) is dict
            path = incoming.get('path')
            assert type(path) is str
            row = next((row for row in self._effective if row['path'] == path), None)
            result = None
            if row is not None:
                assert set(incoming) in ({'path', 'sha256'}, {'path', 'sha256', 'bytes'})
                assert type(incoming['sha256']) is str
                assert 'bytes' not in incoming or type(incoming['bytes']) is int
                candidates = [row['before'], *(item for item in self._intermediates if item['path'] == path), row['after']]
                selected = next((ref for ref in candidates if ref['sha256'] == incoming['sha256']), None)
                assert selected is not None, 'unknown product predecessor ' + path
                assert 'bytes' not in incoming or incoming['bytes'] == selected['bytes']
                target = row['after' if side == 'after' else 'before']
                result = dict(path=path, sha256=target['sha256'], **({'bytes': target['bytes']} if 'bytes' in incoming else {}))
            assert not self._nested_attempt, 'reentrant product successor'
            self._sweep()
            return result
        finally:
            self._active = False

    def qualify(self, incoming):
        return self._select(incoming, 'after')

    def historical_reference(self, incoming):
        return self._select(incoming, 'before')
