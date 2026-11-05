# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Finite current physical source identity; no CSS or artifact admission."""
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import weakref

ROOT = Path(__file__).resolve().parents[1]
SELF = 'scripts/current_sass_source.py'
INPUTS = 'compatibility/rc/current-sass-source-inputs-v1.json'
INPUTS_SHA = '9c3b08100262a981698f58c9a2127697b6ca3f03fde99d864451826534f6ed1a'
SOURCE_JS = dict(path='scripts/current-sass-source.mjs', sha256='49baf8905d138897b7ff56232276c9f1889db5ee3ac31fc554cdc0041d8200d5', bytes=12696)
ADDITIONAL = ['projects/ngx-material-legacy/styles/checkbox/_checkbox-theme.scss',
              'projects/ngx-material-legacy/styles/button/_button-theme.scss']
_IMAGE = (ROOT / SELF).read_bytes()
_STATES = weakref.WeakKeyDictionary()


def _hash(raw):
    return hashlib.sha256(raw).hexdigest()


def _ref(path, raw):
    return dict(path=path, sha256=_hash(raw), bytes=len(raw))


def _safe(path):
    assert type(path) is str and path and not path.startswith('/') and '\\' not in path and '\0' not in path
    assert all(part and part not in ('.', '..') for part in path.split('/'))
    return path


def _physical(root, path):
    _safe(path)
    def regular(base, parts):
        cursor = base
        for part in parts:
            cursor = cursor / part
            assert not cursor.is_symlink(), 'linked source descendant ' + path
        assert cursor.is_file()
        return cursor.read_bytes()
    peer = re.fullmatch(r'node_modules/(@angular/(?:core|material|cdk)|sass)/(.+)', path)
    if not peer:
        return regular(root, path.split('/'))
    container = root / 'node_modules'
    assert container.is_dir() and not container.is_symlink()
    if peer[1].startswith('@angular/'):
        assert (container / '@angular').is_dir() and not (container / '@angular').is_symlink()
    base = (container / peer[1]).resolve(strict=True)
    assert base.is_dir()
    if peer[1] == 'sass':
        assert peer[2] in ('package.json', 'sass.node.js', 'sass.dart.js')
    assert json.loads(regular(base, ['package.json']))['name'] == peer[1]
    return regular(base, peer[2].split('/'))


def _metadata(value):
    assert type(value) is dict
    assert type(value.get('path')) is str and type(value.get('sha256')) is str
    assert 'bytes' not in value or type(value['bytes']) is int
    return {key: value[key] for key in ('path', 'sha256', 'bytes') if key in value}


def _historical_blobs(root, source):
    assert re.fullmatch('[0-9a-f]{40}', source['before_commit'])
    refs = [dict(path=row['path'], **row['before']) for row in source['modules']] + source['unchanged_owned_sass_before_inputs']
    assert len({row['path'] for row in refs}) == len(refs)
    env = dict(PATH=os.environ.get('PATH', ''), LANG='C', LC_ALL='C', GIT_CONFIG_GLOBAL='/dev/null',
               GIT_CONFIG_SYSTEM='/dev/null', GIT_TERMINAL_PROMPT='0', GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1')
    raw = subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
                                  'cat-file', '--batch'], cwd=root, env=env,
                                  input=('\n'.join(source['before_commit'] + ':' + _safe(row['path']) for row in refs) + '\n').encode())
    cursor, result = 0, {}
    for row in refs:
        end = raw.index(b'\n', cursor)
        blob, kind, size_text = raw[cursor:end].decode().split(' ')
        size = int(size_text)
        value = raw[end + 1:end + 1 + size]
        assert kind == 'blob' and size >= 0 and len(value) == size and raw[end + 1 + size] == 10
        assert hashlib.sha1(b'blob ' + str(size).encode() + b'\0' + value).hexdigest() == blob == row['blob']
        assert _hash(value) == row['sha256'] and size == row['bytes']
        result[row['path']] = value
        cursor = end + 2 + size
    assert cursor == len(raw)
    return result


class CurrentSassSource:
    """One finite four-module source authority, backed by immutable comparison data."""
    __slots__ = ('__weakref__',)

    def __init__(self, root=ROOT, *, read=None):
        root = Path(root).absolute()
        assert root.is_dir() and not root.is_symlink()
        assert read is None or callable(read)
        bound = {}
        def assert_physical():
            for row in bound.values():
                assert _ref(row['path'], _physical(root, row['path'])) == row, 'changed final physical source ' + row['path']
        def current(path):
            actual = _physical(root, path)
            row = _ref(path, actual)
            if path in bound:
                assert row == bound[path]
            else:
                bound[path] = row
            if read is not None:
                supplied = read(path)
                assert type(supplied) is bytes and actual == supplied, 'nonphysical current source ' + path
            assert _physical(root, path) == actual, 'source changed during read ' + path
            return actual
        def member(row):
            raw = current(row['path'])
            assert _hash(raw) == row['sha256'] and len(raw) == row['bytes'], 'changed current Sass source ' + row['path']
            return raw
        assert current(SELF) == _IMAGE
        member(SOURCE_JS)
        raw = current(INPUTS)
        assert _hash(raw) == INPUTS_SHA
        packet = json.loads(raw)
        assert packet['schema_version'] == 1 and packet['css_admission_granted'] is False
        assert [row['path'] for row in packet['additional_modules']] == ADDITIONAL
        base = json.loads(member(packet['historical_source_packet']))
        member(packet['historical_source_subject'])
        css = json.loads(member(packet['historical_css_packet']))
        for name in ('oracle', 'catalog', 'provenance', 'reference_lock'):
            member(css[name])
        for row in css['compiler_inputs']:
            member(row)
        member(packet['proposal'])
        protected_packet = json.loads(member(packet['protected_input_packet']))
        census = json.loads(member(packet['style_template_census']))
        version = json.loads(current('projects/ngx-material-legacy/package.json'))['version']
        line = '21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None
        assert line is not None
        source, branch = base['branches'][line], packet['branches'][line]
        member(css['branches'][line]['observation'])
        assert branch['minimum_versions'] == source['minimum_versions']
        assert len(source['inputs']) == branch['historical_loaded_input_count']
        assert len(source['unchanged_owned_sass_before_inputs']) == branch['unchanged_owned_before_count']
        assert branch['new_loaded_edges'] == []
        assert packet['product_paths'] == [row['path'] for row in source['modules']] + ADDITIONAL
        historical = _historical_blobs(root, source)
        changes = {row['path']: row for row in packet['additional_modules']}
        for row in changes.values():
            before = historical[row['path']]
            assert _ref(row['path'], before) == row['before']
            lines, cursor, expected = before.decode().splitlines(keepends=True), 0, ''
            for insertion in row['insertions']:
                position = insertion['before_line']
                assert type(position) is int and cursor <= position <= len(lines)
                assert type(insertion['text']) is str and insertion['text']
                expected += ''.join(lines[cursor:position]) + insertion['text']
                cursor = position
            expected += ''.join(lines[cursor:])
            assert _ref(row['path'], expected.encode()) == row['current']
            assert member(row['afterimage']) == expected.encode()
        for row in source['inputs']:
            member(changes[row['path']]['current'] if row['path'] in changes else row)
        member(source['semantic_receipt'])
        for row in source['unchanged_owned_sass_before_inputs']:
            actual = member(changes[row['path']]['current'] if row['path'] in changes else row)
            if row['path'] not in changes:
                assert actual == historical[row['path']]
        for row in protected_packet['branches'][line]['protected_inputs']:
            member(row)
        graph = next(row for row in census['lines'] if row['line'] == line)
        assert len(graph['non_target_owned_style_template_graph']) == graph['non_target_graph_count']
        for row in graph['non_target_owned_style_template_graph']:
            member(row)
        transitions = [dict(path=row['path'], before=row['before'], current=row['current']) for row in source['modules'] + packet['additional_modules']]
        for row in transitions:
            member(row['current'])
        source_sets, source_set_successors = {}, []
        for key, rows in css['branches'][line]['source_sets'].items():
            assert _hash(json.dumps(rows, separators=(',', ':')).encode()) == key
            current_rows = []
            for row in rows:
                changed = changes.get('projects/ngx-material-legacy/' + row['path']) if row['root'] == 0 else None
                current_rows.append(dict(row, sha256=changed['current']['sha256'], bytes=changed['current']['bytes']) if changed else dict(row))
            current_hash = _hash(json.dumps(current_rows, separators=(',', ':')).encode())
            source_sets[current_hash] = current_rows
            source_set_successors.append(dict(historical_sha256=key, current_sha256=current_hash))
        def assert_current():
            for row in list(bound.values()):
                member(row)
            assert_physical()
        descriptor = dict(source_subject=dict(SOURCE_JS), source_packet=_ref(INPUTS, raw), source_modules=[row['current'] for row in transitions])
        _STATES[self] = dict(root=root, line=line, bound=bound, transitions=transitions, source_sets=source_sets, source_set_successors=source_set_successors,
                             descriptor=descriptor, historical=historical, assert_current=assert_current, assert_physical=assert_physical)
        assert_current()

    @property
    def line(self):
        return _STATES[self]['line']

    @property
    def bound(self):
        return copy.deepcopy(list(_STATES[self]['bound'].values()))

    @property
    def transitions(self):
        return copy.deepcopy(_STATES[self]['transitions'])

    @property
    def source_sets(self):
        return copy.deepcopy(_STATES[self]['source_sets'])

    @property
    def descriptor(self):
        return copy.deepcopy(_STATES[self]['descriptor'])

    @property
    def source_set_successors(self):
        return copy.deepcopy(_STATES[self]['source_set_successors'])

    def assert_current(self):
        _STATES[self]['assert_current']()

    def qualify(self, incoming):
        original = _metadata(incoming)
        state = _STATES[self]
        row = next((row for row in state['transitions'] if row['path'] == original['path']), None)
        if row is None:
            return None
        selected = next((value for value in (row['before'], row['current']) if value['sha256'] == original['sha256']), None)
        assert selected is not None, 'unknown owned source hash'
        assert 'bytes' not in original or original['bytes'] == selected['bytes']
        state['assert_current']()
        assert _metadata(incoming) == original, 'source reference mutated'
        result = dict(path=row['path'], sha256=row['current']['sha256'])
        if 'bytes' in original:
            result['bytes'] = row['current']['bytes']
        state['assert_physical']()
        return result

    def assert_historical_source(self, path, expected):
        state = _STATES[self]
        row = next(row for row in state['transitions'] if row['path'] == _safe(path))
        assert type(expected) in (str, bytes)
        raw = expected.encode() if type(expected) is str else expected
        assert raw == state['historical'][path] and _hash(raw) == row['before']['sha256']
        state['assert_current']()
        state['assert_physical']()
        return dict(path=path, before_sha256=row['before']['sha256'], current_sha256=row['current']['sha256'],
                    exact_historical_comparison=True, current_physical_source_guarded=True)
