# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent finite current tool references; historical programs remain data."""
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

SELF = 'scripts/current_sass_tool_references.py'
INPUTS = 'compatibility/rc/current-sass-tool-reference-inputs-v2.json'
PREVIOUS_INPUTS = dict(path='compatibility/rc/current-sass-tool-reference-inputs-v1.json',
                       sha256='ffb8fb98babb084a86e4d49f13ef17069f784eb732365c566f6c764efd62e64f', bytes=478008)
CHECKPOINTS = {'21.x': 'b25aedd02f7b53e8cd8dfcdad369a806a1301619',
               'main': '5e9f8e51fd53b63500ce9f292a3b0bd9e8b4e2d8'}
INPUTS_SHA = 'd25ef6684992ececd518f7932bc68f5d43d433df23868d7a376ebf0a9e56a770'
_IMAGE = Path(__file__).read_bytes()


def _hash(raw):
    return hashlib.sha256(raw).hexdigest()


def _ref(path, raw):
    return dict(path=path, sha256=_hash(raw), bytes=len(raw))


def _plain(value):
    if value is None or type(value) in (str, bool):
        return value
    if type(value) is int:
        assert abs(value) <= 9007199254740991
        return value
    if type(value) is list:
        return [_plain(row) for row in value]
    assert type(value) is dict
    assert all(type(key) is str for key in value)
    return {key: _plain(item) for key, item in value.items()}


def _metadata(value):
    snapshot = _plain(value)
    assert type(snapshot) is dict and type(snapshot['path']) is str
    assert type(snapshot['sha256']) is str and re.fullmatch('[0-9a-f]{64}', snapshot['sha256'])
    if 'bytes' in snapshot:
        assert type(snapshot['bytes']) is int and snapshot['bytes'] >= 0
    return snapshot


def _physical(root, path):
    assert type(path) is str and path and '\\' not in path and '\0' not in path
    assert root.is_dir() and not root.is_symlink()
    cursor = root
    for part in path.split('/'):
        assert part and part not in ('.', '..')
        cursor /= part
        assert not cursor.is_symlink()
    assert cursor.is_file()
    return cursor.read_bytes()


def _matches(raw, ref):
    assert _hash(raw) == ref['sha256']
    if 'bytes' in ref:
        assert type(ref['bytes']) is int and len(raw) == ref['bytes']


def _tool_path(path):
    return type(path) is str and re.fullmatch(r'(?:scripts|tests)/[a-zA-Z0-9_.-]+\.(?:mjs|cjs|py)', path)


def _git_images(root, requests):
    unique = {(row['commit'], row['path']): row for row in requests}
    for commit, path in unique:
        assert re.fullmatch('[0-9a-f]{40}', commit)
        assert path and '..' not in path and '\n' not in path and '\0' not in path and not path.startswith('/')
    env = dict(PATH=os.environ['PATH'], LANG='C', LC_ALL='C', GIT_CONFIG_GLOBAL='/dev/null',
               GIT_CONFIG_SYSTEM='/dev/null', GIT_TERMINAL_PROMPT='0', GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1')
    raw = subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
                                   'cat-file', '--batch'], cwd=root, env=env,
                                  input=('\n'.join(commit + ':' + path for commit, path in unique) + '\n').encode())
    out, cursor = {}, 0
    for key in unique:
        end = raw.index(b'\n', cursor)
        blob, kind, length = raw[cursor:end].decode().split(' ')
        assert kind == 'blob'
        size = int(length)
        assert size >= 0
        body = raw[end + 1:end + size + 1]
        assert len(body) == size and raw[end + size + 1] == 10
        assert hashlib.sha1(b'blob ' + str(size).encode() + b'\0' + body).hexdigest() == blob
        out[key] = body
        cursor = end + size + 2
    assert cursor == len(raw)
    return out


def _edited(before, edits):
    assert type(edits) is list
    parts, cursor = [], 0
    for edit in edits:
        assert set(edit) == {'offset', 'before', 'after'}
        assert type(edit['offset']) is int and edit['offset'] >= cursor
        assert type(edit['before']) is type(edit['after']) is str and edit['before'] != edit['after']
        old, after, offset = edit['before'].encode(), edit['after'].encode(), edit['offset']
        assert before[offset:offset + len(old)] == old
        parts.extend([before[cursor:offset], after])
        cursor = offset + len(old)
    return b''.join([*parts, before[cursor:]])


class CurrentSassToolReferences:
    def __init__(self, root, *, read=None):
        self.root = Path(root).absolute()
        assert self.root.is_dir() and not self.root.is_symlink()
        assert read is None or callable(read)
        self._provided, self._bound, self._rows = read, {}, {}
        assert self._read(SELF) == _IMAGE
        packet = json.loads(self._member(dict(path=INPUTS, sha256=INPUTS_SHA)))
        assert packet['schema_version'] == 2 and packet['role'] == 'finite-current-sass-tool-reference-successor'
        assert packet['previous_epoch'] == PREVIOUS_INPUTS
        previous_raw = self._member(PREVIOUS_INPUTS)
        previous = json.loads(previous_raw)
        assert previous['schema_version'] == 1 and previous['role'] == packet['role']
        assert packet['product_paths'] == [] and packet['historical_programs_executed'] is False
        assert packet['historical_reports_rewritten'] == 0 and packet['artifact_or_audit_admission_granted'] is False
        version = json.loads(self._read('projects/ngx-material-legacy/package.json'))['version']
        self.line = '21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None
        assert self.line is not None
        branch = packet['branches'][self.line]
        prior_branch = previous['branches'][self.line]
        assert branch['previous_epoch_source_parent'] == CHECKPOINTS[self.line]
        assert branch['historical_registry'] == prior_branch['historical_registry']
        assert branch['intermediate_inputs'] == prior_branch['intermediate_inputs']
        previous_git = _git_images(self.root, [dict(commit=CHECKPOINTS[self.line], path=PREVIOUS_INPUTS['path'])])[(CHECKPOINTS[self.line], PREVIOUS_INPUTS['path'])]
        assert previous_raw == previous_git, 'V1 epoch differs from committed comparison data'
        assert len({r['path'] for r in branch['updates']}) == len(branch['updates'])
        assert len({r['path'] for r in branch['additional_inputs']}) == len(branch['additional_inputs'])
        archived = branch['historical_registry']
        registry = _git_images(self.root, [dict(commit=archived['source_parent'], path=archived['path'])])[(archived['source_parent'], archived['path'])]
        _matches(registry, archived)
        assert self._member(archived) == registry
        historical = json.loads(registry)
        assert historical['line'] == self.line and historical['extension_kind'] == 'spinner-snack-c04-source'
        assert historical['gate_tool_successor'] and len(historical['tool_transitions']) == (45 if self.line == '21.x' else 17)
        assert historical['canonical_dispositions_changed'] == historical['product_changes'] == 0
        assert historical['old_programs_executed'] is False and historical['g11_claim'] == 'not-passed'
        requests = [dict(commit=r.get('source_parent', historical['source_parent']), path=r['path']) for r in historical['tool_transitions']]
        requests += [dict(commit=r['source_parent'], path=r['path']) for r in branch['intermediate_inputs']]
        requests += [dict(commit=r.get('source_parent', archived['source_parent']), path=r['path']) for r in branch['updates']]
        requests += [dict(commit=CHECKPOINTS[self.line], path=r['path']) for r in prior_branch['updates']]
        for old in prior_branch['updates']:
            latest = next((r for r in branch['updates'] if r['path'] == old['path']), None)
            assert latest is not None, 'missing V1 current tool ' + old['path']
            assert latest['before'] == old['before']
            assert latest.get('source_parent', archived['source_parent']) == archived['source_parent']
        images = _git_images(self.root, requests)
        for source in historical['tool_transitions']:
            path = source['path']
            assert _tool_path(path) and path not in self._rows
            before = images[(source.get('source_parent', historical['source_parent']), path)]
            _matches(before, source['before'])
            after = before.decode()
            assert source['literal_edits']
            for edit in source['literal_edits']:
                assert after.count(edit['before']) == 1
                after = after.replace(edit['before'], edit['after'])
            row = dict(path=path, before=dict(source['before']), after=dict(source['after']), identities={})
            self._add(row, source['before'], before)
            self._add(row, source['after'], after.encode())
            self._rows[path] = row
        support = {row['path']: row for row in historical['support_inputs']}
        for update in branch['updates']:
            path = update['path']
            assert _tool_path(path)
            parent = update.get('source_parent', archived['source_parent'])
            assert parent in (archived['source_parent'], CHECKPOINTS[self.line])
            before = images[(parent, path)]
            _matches(before, update['before'])
            row = self._rows.get(path)
            if row is not None:
                assert update['before'] == dict(path=path, **row['after'])
            elif path in support:
                assert update['before'] == support[path]
            after = _edited(before, update['edits'])
            _matches(after, update['after'])
            assert self._member(update['after']) == after
            if row is None:
                row = dict(path=path, before=dict(sha256=update['before']['sha256'], bytes=update['before']['bytes']), identities={})
            self._add(row, update['before'], before)
            self._add(row, update['after'], after)
            row['after'] = dict(sha256=update['after']['sha256'], bytes=update['after']['bytes'])
            self._rows[path] = row
        # Latest rows must exist before registering V1 current/intermediate identities.
        for source in branch['intermediate_inputs']:
            self._add(self._rows[source['path']], source, images[(source['source_parent'], source['path'])])
        for source in prior_branch['updates']:
            self._add(self._rows[source['path']], source['after'], images[(CHECKPOINTS[self.line], source['path'])])
        self._member(historical['unchanged_source_subject'])
        for ref in historical['support_inputs']:
            if not any(row['path'] == ref['path'] for row in branch['updates']):
                self._member(ref)
        for ref in branch['additional_inputs']:
            assert _tool_path(ref['path']) or ref['path'].startswith('compatibility/rc/')
            self._member(ref)
        for row in self._rows.values():
            self._member(dict(path=row['path'], **row['after']))
        self.epoch = 2
        self.assert_current()

    def _add(self, row, ref, raw):
        _matches(raw, ref)
        if ref['sha256'] in row['identities']:
            assert row['identities'][ref['sha256']] == raw
        row['identities'][ref['sha256']] = raw

    def _read(self, path):
        raw = _physical(self.root, path)
        ref = _ref(path, raw)
        if path in self._bound:
            assert self._bound[path] == ref
        else:
            self._bound[path] = ref
        if self._provided is not None:
            provided = self._provided(path)
            assert type(provided) is bytes and provided == raw
        assert _physical(self.root, path) == raw
        return raw

    def _member(self, ref):
        raw = self._read(ref['path'])
        _matches(raw, ref)
        return raw

    def _assert_physical(self):
        for ref in self._bound.values():
            assert _ref(ref['path'], _physical(self.root, ref['path'])) == ref

    @property
    def bound(self):
        return copy.deepcopy(list(self._bound.values()))

    @property
    def transitions(self):
        return [dict(path=row['path'], before=dict(row['before']), after=dict(row['after'])) for row in self._rows.values()]

    def assert_current(self):
        for ref in list(self._bound.values()):
            self._member(ref)
        self._assert_physical()

    def owns_reference(self, incoming):
        try:
            ref = _metadata(incoming)
            row = self._rows.get(ref['path'])
            raw = None if row is None else row['identities'].get(ref['sha256'])
            return raw is not None and ('bytes' not in ref or ref['bytes'] == len(raw))
        except (AssertionError, KeyError, TypeError, ValueError):
            return False

    def _side(self, incoming, target):
        snapshot = _metadata(incoming)
        row = self._rows.get(snapshot['path'])
        if row is None or snapshot['sha256'] not in row['identities']:
            return None
        _matches(row['identities'][snapshot['sha256']], snapshot)
        self._member(dict(path=row['path'], **row['after']))
        result = {**snapshot, 'sha256': row[target]['sha256'], **({'bytes': row[target]['bytes']} if 'bytes' in snapshot else {})}
        assert _metadata(incoming) == snapshot
        self._assert_physical()
        return result

    def qualify(self, ref):
        return self._side(ref, 'after')

    def predecessor_reference(self, ref):
        return self._side(ref, 'before')

    def comparison_bytes(self, incoming):
        snapshot = _metadata(incoming)
        row = self._rows[snapshot['path']]
        raw = row['identities'][snapshot['sha256']]
        _matches(raw, snapshot)
        self._member(dict(path=row['path'], **row['after']))
        assert _metadata(incoming) == snapshot
        self._assert_physical()
        return raw
