# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Authenticate the two committed dialog focus edits against physical current source."""
from collections import namedtuple
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
from weakref import WeakKeyDictionary, WeakSet

SELF = 'scripts/dialog_focus_finite_source_successor_v6.py'
SOURCE_PACKET = 'compatibility/rc/parent-dialog-focus-finite-source-successor-v5.json'
ROSTER_PACKET = 'compatibility/rc/parent-dialog-focus-authored-use-successor-v5.json'
SOURCE_PINS = {'21.x': ('74890ca9a672ac9ce3114087447c7117eea0502bfac1a96d54b1ac4e327caa51', 12280),
               'main': ('c7a93f8d17e3aafb5e93297bcb4af98ba9df4d1bb88c1841fc1c7eeb4434b733', 12280)}
ROSTER_PINS = {'21.x': ('9c967f9246bf68cc5e599e6a4fc12c3d8cce40018fe426f1d8db53127f01d956', 50877),
               'main': ('d244b2cacae1ac2c90898ab76f2f399eb734d2b49c07759ff14424df0cf2d3d4', 50877)}
V4_SOURCE = ('compatibility/rc/parent-select-dialog-menu-snack-d61-menu-finite-source-v4.json',
             'f8f9423c7dff2ffd5ee72fa812f137bb5db8e59a4b88b7c1868086e3bdb28777', 112277)
V4_ROSTER = ('compatibility/rc/parent-dialog-menu-snack-d61-menu-authored-use-successor-v4.json',
             '67861dc8b64cdfcd7f9792065b755084a51e25490bab46c6f71ac6b47d122e35', 301398)
PATHS = ('projects/ngx-material-legacy/legacy-dialog/internal/dialog-container-base.ts',
         'projects/ngx-material-legacy/legacy-dialog/dialog-container.ts')
PEER_PREFIX = 'node_modules/@angular/core/types/'
COMMITS = {'21.x': ('4b80ca0ac0ce6255c83b7eaea1c04bd6cd51f4cb', '616bf749eb63e4f7d300291d38ecfed9bb573213'),
           'main': ('36cc0feb5ff9fefe95d354b251ac8f6b37b067e2', 'b8e00f603869daaabb72e5b5ee464ce510fe9b47')}
_IMAGE = (Path(__file__).absolute().parents[1] / SELF).read_bytes()
_State = namedtuple('_State', 'root read bound records row_images')
_STATES = WeakKeyDictionary()
_ACTIVE = WeakSet()
_VIOLATIONS = WeakSet()


def _hash(raw):
    return hashlib.sha256(raw).hexdigest()


def _blob(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()


def _safe_path(path):
    assert type(path) is str and path and not path.startswith('/') and '\\' not in path and '\0' not in path
    assert all(part and part not in ('.', '..') for part in path.split('/'))
    return path


def _physical(root, path):
    path = _safe_path(path)
    cursor = root
    for part in path.split('/'):
        cursor = cursor / part
        if not path.startswith('node_modules/@angular/core/'):
            assert not cursor.is_symlink(), 'linked focus source ' + path
    assert cursor.is_file(), 'missing focus input ' + path
    return cursor.read_bytes()


def _ref(path, raw):
    return (path, _hash(raw), len(raw))


def _historical(root, commit, path):
    assert re.fullmatch('[0-9a-f]{40}', commit)
    env = {key: value for key, value in os.environ.items() if not key.startswith('GIT_')}
    env.update(GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1', GIT_TERMINAL_PROMPT='0')
    return subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
                                    'show', commit + ':' + _safe_path(path)], cwd=root, env=env, stderr=subprocess.PIPE)


def _public_declaration(body, expression, symbol):
    match = re.search(expression, body)
    assert match is not None, 'missing minimum declaration ' + symbol
    opening, closing = body.rfind('/**', 0, match.start()), body.rfind('*/', 0, match.start())
    assert opening >= 0 and closing > opening, 'missing public declaration documentation ' + symbol
    doc = body[opening:closing]
    assert '@publicApi' in doc and '@deprecated' not in doc and '@docs-private' not in doc, 'nonpublic declaration ' + symbol


class DialogFocusFiniteSourceV6:
    """Finite physical source identity; Git bytes are proof data, never a public read route."""
    __slots__ = ('__weakref__',)

    def __setattr__(self, name, value):
        raise AttributeError('sealed focus source successor state')

    def __delattr__(self, name):
        raise AttributeError('sealed focus source successor state')

    @property
    def _root(self):
        return _STATES[self].root

    @property
    def _read(self):
        return _STATES[self].read

    @property
    def _bound(self):
        return _STATES[self].bound

    @property
    def _records(self):
        return _STATES[self].records

    @property
    def _row_images(self):
        return _STATES[self].row_images

    @property
    def _active(self):
        return self in _ACTIVE

    def __init__(self, root, *, read=None, line=None):
        if not __debug__:
            raise RuntimeError('optimized Python cannot authenticate dialog focus source')
        assert self not in _STATES, 'focus source successor already initialized'
        root = Path(root).absolute()
        assert root.is_dir() and not root.is_symlink(), 'invalid focus source root'
        assert read is None or callable(read)
        version = json.loads(_physical(root, 'projects/ngx-material-legacy/package.json'))['version']
        actual_line = '21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None
        assert actual_line in ('21.x', 'main') and (line is None or line == actual_line), 'wrong focus source line'
        assert _physical(root, SELF) == _IMAGE, 'changed loaded focus source successor'
        source_bytes = _physical(root, SOURCE_PACKET)
        roster_bytes = _physical(root, ROSTER_PACKET)
        assert (_hash(source_bytes), len(source_bytes)) == SOURCE_PINS[actual_line], 'changed focus source packet'
        assert (_hash(roster_bytes), len(roster_bytes)) == ROSTER_PINS[actual_line], 'changed focus authored-use packet'
        packet, roster = json.loads(source_bytes), json.loads(roster_bytes)
        assert packet['schema_version'] == roster['schema_version'] == 1
        assert packet['role'] == 'finite-dialog-focus-current-source-successor'
        assert packet['source_scope_only'] is True and packet['historical_programs_executed'] is False
        assert packet['canonical_admission_granted'] is False and packet['g11_claim'] == 'not-passed'
        assert roster['role'] == 'finite-dialog-focus-authored-use-successor'
        assert roster['source_scope_only'] is True and roster['g11_claim'] == 'not-passed'
        assert roster['review']['status'] == 'reviewed' and roster['review']['conclusion'] == 'stable-public-peer'
        assert packet['previous_packet'] == dict(path=V4_SOURCE[0], sha256=V4_SOURCE[1], bytes=V4_SOURCE[2])
        assert roster['previous_packet'] == dict(path=V4_ROSTER[0], sha256=V4_ROSTER[1], bytes=V4_ROSTER[2])
        rows = packet['branches'][actual_line]['transitions']
        assert [row['path'] for row in rows] == list(PATHS), 'changed focus path set'
        delta = roster['branches'][actual_line]
        minimum = '21.2.23' if actual_line == '21.x' else '22.1.7'
        assert delta['core_version'] == minimum
        assert delta['source_files'] == 532 and delta['previous_uses'] == 1966 and delta['current_uses'] == 1970
        assert len(delta['changed_uses']) == 45 and len(delta['added_uses']) == 4 and delta['removed_uses'] == []
        assert sorted(row['symbol'] for row in delta['added_uses']) == sorted(('AfterRenderRef', 'ApplicationRef', 'Injector', 'afterNextRender'))
        chunk = '_discovery-chunk.d.ts' if actual_line == '21.x' else '_debug_node-chunk.d.ts'
        expected_declarations = (PEER_PREFIX + 'core.d.ts', PEER_PREFIX + chunk,
                                 PEER_PREFIX + '_chrome_dev_tools_performance-chunk.d.ts')
        declarations = delta['core_declarations']
        assert [ref['path'] for ref in declarations] == list(expected_declarations), 'changed peer declaration set'
        core_package = _physical(root, 'node_modules/@angular/core/package.json')
        assert json.loads(core_package)['version'] == minimum, 'wrong minimum Angular core'
        bound = [_ref(SELF, _IMAGE), _ref(SOURCE_PACKET, source_bytes), _ref(ROSTER_PACKET, roster_bytes)]
        for path, digest, size in (V4_SOURCE, V4_ROSTER):
            raw = _physical(root, path)
            assert (_hash(raw), len(raw)) == (digest, size), 'changed v4 predecessor ' + path
            bound.append((path, digest, size))
        records = []
        for row in rows:
            path = row['path']
            assert row['source_parent'] == COMMITS[actual_line][0] and row['source_commit'] == COMMITS[actual_line][1]
            before, committed_after = (_historical(root, row[key], path) for key in ('source_parent', 'source_commit'))
            for side, raw in (('before', before), ('after', committed_after)):
                ref = row[side]
                assert set(ref) == {'path', 'sha256', 'bytes', 'git_blob'} and ref['path'] == path
                assert (_hash(raw), len(raw), _blob(raw)) == (ref['sha256'], ref['bytes'], ref['git_blob']), 'bad focus ' + side + ' image'
            chunks, cursor = [], 0
            for edit in row['edits']:
                assert set(edit) == {'offset', 'before', 'after'}
                offset, old_bytes = edit['offset'], edit['before'].encode()
                assert type(offset) is int and cursor <= offset <= len(before)
                assert before[offset:offset + len(old_bytes)] == old_bytes, 'bad focus literal preimage'
                chunks.extend((before[cursor:offset], edit['after'].encode()))
                cursor = offset + len(old_bytes)
            assert b''.join(chunks) + before[cursor:] == committed_after, 'bad focus exact edit'
            if actual_line == 'main' and path == PATHS[0]:
                tp='compatibility/rc/parent-main-dialog-focus-sass-source-v6.json';traw=_physical(root,tp)
                assert (_hash(traw),len(traw))==('bac522943f0d1ffbecfe44fd4ce85358a4b4b00870b64ce6dbc335295666fcc0',32714);t=json.loads(traw)
                assert t['schema_version']==1 and t['role']=='finite-dialog-focus-current-sass-source-v6' and t['line']=='main'
                assert t['source_scope_only'] is True and t['historical_programs_executed'] is False and t['canonical_admission_granted'] is False and t['g11_claim']=='not-passed'
                assert t['predecessor_commit']=='8baa761eca624c9d71293c3d31750a2b3fdeebf0' and t['source_commit']=='767bcbcc484722759f667dbe709ade31f5040b82'
                assert t['review']['path']=='compatibility/rc/parent-main-dialog-readiness-integration-review-v1.json';review=_physical(root,t['review']['path']);assert dict(path=t['review']['path'],sha256=_hash(review),bytes=len(review))==t['review']
                env={k:v for k,v in os.environ.items() if not k.startswith('GIT_')};env.update(GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1',GIT_TERMINAL_PROMPT='0')
                for a,b in ((t['predecessor_commit'],t['source_commit']),(t['source_commit'],'HEAD')):subprocess.check_call(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','merge-base','--is-ancestor',a,b],cwd=root,env=env)
                assert row['after']==t['before'] and committed_after==_historical(root,t['predecessor_commit'],path)
                new=_historical(root,t['source_commit'],path);chunks2=[];cursor2=0
                for edit in t['edits']:
                    assert set(edit)=={'offset','before','after'};offset=edit['offset'];old=edit['before'].encode();assert type(offset) is int and cursor2<=offset<=len(committed_after) and committed_after[offset:offset+len(old)]==old;chunks2.extend((committed_after[cursor2:offset],edit['after'].encode()));cursor2=offset+len(old)
                assert b''.join(chunks2)+committed_after[cursor2:]==new and (_hash(new),len(new),_blob(new))==(t['after']['sha256'],t['after']['bytes'],t['after']['git_blob'])
                bound.extend([_ref(tp,traw),_ref(t['review']['path'],review)]);row['intermediate_after']=row['after'];row['after']=t['after'];committed_after=new
            assert _physical(root, path) == committed_after, 'changed current focus product ' + path
            bound.append(_ref(path, committed_after))
            records.append((path, row['before']['sha256'], row['before']['bytes'], row['after']['sha256'], row['after']['bytes'], row.get('intermediate_after',row['after'])['sha256'], row.get('intermediate_after',row['after'])['bytes']))
        declaration_text = {}
        for ref in declarations:
            assert set(ref) == {'path', 'sha256', 'bytes'}
            raw = _physical(root, ref['path'])
            assert (_hash(raw), len(raw)) == (ref['sha256'], ref['bytes']), 'changed minimum peer declaration ' + ref['path']
            declaration_text[ref['path']] = raw.decode()
            bound.append((ref['path'], ref['sha256'], ref['bytes']))
        core = declaration_text[expected_declarations[0]]
        discovery = declaration_text[expected_declarations[1]]
        di = declaration_text[expected_declarations[2]]
        _public_declaration(core, r'declare function afterNextRender<E', 'afterNextRender')
        _public_declaration(discovery, r'interface AfterRenderRef\s*\{', 'AfterRenderRef')
        _public_declaration(discovery, r'declare class ApplicationRef\s*\{', 'ApplicationRef')
        _public_declaration(di, r'declare abstract class Injector\s*\{', 'Injector')
        options = re.search(r'interface AfterRenderOptions\s*\{([^}]*)\}', core, re.S)
        assert options is not None and 'manualCleanup?: boolean;' in options.group(1) and 'injector?: Injector;' in options.group(1)
        assert 'mixedReadWrite?:' in core and re.search(r'interface AfterRenderRef\s*\{[^}]*destroy\(\): void;', discovery, re.S)
        for symbol in ('afterNextRender', 'AfterRenderRef', 'ApplicationRef', 'Injector'):
            assert re.search(r'export \{[^}]*\b' + symbol + r'\b', core), 'missing public core export ' + symbol
        bound.append(_ref('node_modules/@angular/core/package.json', core_package))
        assert len({ref[0] for ref in bound}) == len(bound)
        _STATES[self] = _State(root, read, tuple(bound), tuple(records),
                               tuple(json.dumps(row, sort_keys=True, separators=(',', ':')).encode() for row in rows))
        try:
            self.assert_current()
        except BaseException:
            _STATES.pop(self, None)
            raise

    @property
    def bound(self):
        return [dict(path=path, sha256=digest, bytes=size) for path, digest, size in self._bound]

    @property
    def transitions(self):
        return [json.loads(raw) for raw in self._row_images]

    def _idle(self):
        if self._active:
            _VIOLATIONS.add(self)
            raise AssertionError('reentrant focus source successor')

    def _sweep(self):
        for path, digest, size in self._bound:
            raw = _physical(self._root, path)
            assert (_hash(raw), len(raw)) == (digest, size), 'changed physical focus input ' + path
        assert _physical(self._root, SELF) == _IMAGE, 'changed loaded focus successor'

    def assert_physical(self):
        self._idle()
        self._sweep()

    def assert_current(self):
        self._idle()
        _VIOLATIONS.discard(self)
        _ACTIVE.add(self)
        try:
            self._sweep()
            for path, digest, size in self._bound:
                before = _physical(self._root, path)
                assert (_hash(before), len(before)) == (digest, size)
                if not path.startswith('node_modules/'):
                    supplied = before if self._read is None else self._read(path)
                    assert type(supplied) is bytes and supplied == before, 'nonphysical focus callback ' + path
                self._sweep()
            assert self not in _VIOLATIONS, 'reentrant focus source successor'
            self._sweep()
        finally:
            _ACTIVE.discard(self)
            _VIOLATIONS.discard(self)

    def _select(self, incoming, side):
        self._idle()
        assert type(incoming) is dict
        path = incoming.get('path')
        record = next((row for row in self._records if row[0] == path), None)
        if record is None:
            return None
        self.assert_physical()
        assert set(incoming) in ({'path', 'sha256'}, {'path', 'sha256', 'bytes'})
        source = next((candidate for candidate in ((record[1], record[2]), (record[3], record[4]), (record[5], record[6]))
                       if candidate[0] == incoming['sha256']), None)
        assert source is not None, 'unknown focus predecessor ' + path
        assert 'bytes' not in incoming or incoming['bytes'] == source[1]
        return dict(path=path, sha256=record[3 if side == 'after' else 1],
                    **({'bytes': record[4 if side == 'after' else 2]} if 'bytes' in incoming else {}))

    def qualify(self, incoming):
        return self._select(incoming, 'after')

    def historical_reference(self, incoming):
        return self._select(incoming, 'before')
