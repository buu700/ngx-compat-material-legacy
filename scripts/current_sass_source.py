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
from select_dialog_finite_source_successor_v4 import SelectDialogFiniteSourceV4

ROOT = Path(__file__).resolve().parents[1]
SELF = 'scripts/current_sass_source.py'
FOCUS_STYLE_PACKET=dict(path='compatibility/rc/current-main-strong-focus-source-v1.json',sha256='e4f6c47d595edc21f102a756e3a827d077c0f717f1968b8672c691d4fb336ccb',bytes=1030)
INPUTS = 'compatibility/rc/current-sass-source-inputs-v2.json'
INPUTS_SHA = '46e1c8e8657880c1168010c8ec1b5967cbb4aa4c289a4d9b9ae29e3b2182b0a9'
SOURCE_JS = dict(path='scripts/current-sass-source.mjs', sha256='7bb757ac9558bceb3280fa439d43c382c603540f4c5a534c4043db9d6c071192', bytes=25182)
ADDITIONAL = ['projects/ngx-material-legacy/styles/checkbox/_checkbox-theme.scss',
              'projects/ngx-material-legacy/styles/button/_button-theme.scss',
              'projects/ngx-material-legacy/styles/card/_card-theme.scss']
CARD = ADDITIONAL[2]
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


def _historical_blobs(root, source, profile):
    assert re.fullmatch('[0-9a-f]{40}', source['before_commit'])
    assert re.fullmatch('[0-9a-f]{40}', profile['source_parent'])
    assert [row['path'] for row in profile['source_implementations']] == ['scripts/current-sass-source.mjs', 'scripts/current_sass_source.py']
    refs = ([dict(path=row['path'], **row['before']) for row in source['modules']] + source['unchanged_owned_sass_before_inputs']
            + [dict(row, source_parent=profile['source_parent']) for row in profile['source_implementations']])
    assert len({row['path'] for row in refs}) == len(refs)
    env = dict(PATH=os.environ.get('PATH', ''), LANG='C', LC_ALL='C', GIT_CONFIG_GLOBAL='/dev/null',
               GIT_CONFIG_SYSTEM='/dev/null', GIT_TERMINAL_PROMPT='0', GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1')
    raw = subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
                                  'cat-file', '--batch'], cwd=root, env=env,
                                  input=('\n'.join(row.get('source_parent', source['before_commit']) + ':' + _safe(row['path']) for row in refs) + '\n').encode())
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


def _verified_helper(root, path, digest, name):
    # Execute only this pinned physical image; never reuse an import-cache authority.
    raw = _physical(root, path)
    assert _hash(raw) == digest, 'changed source executable ' + path
    namespace = {'__file__': str(root / path), '__name__': '_verified_' + name}
    exec(compile(raw, str(root / path), 'exec'), namespace)
    assert _physical(root, path) == raw, 'source executable changed during load'
    return namespace[name]


class CurrentSassSource:
    """One finite six-module source authority, backed by immutable comparison data."""
    __slots__ = ('__weakref__',)

    def __init__(self, root=ROOT, *, read=None):
        if not __debug__:
            raise RuntimeError('optimized Python cannot authenticate current Sass source')
        root = Path(root).absolute()
        assert root.is_dir() and not root.is_symlink()
        assert read is None or callable(read)
        bound = {}
        graph_successor = None
        def assert_physical():
            for row in bound.values():
                assert _ref(row['path'], _physical(root, row['path'])) == row, 'changed final physical source ' + row['path']
            product.assert_physical()
            focus.assert_physical()
            sixth.assert_physical()
            if graph_successor is not None: graph_successor.assert_physical()
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
        focus_style=None;git_style_before=None
        def member(row):
            projected=focus_style is not None and row['path']==focus_style['before']['path'] and row['sha256']==focus_style['before']['sha256']
            if projected:assert row['bytes']==focus_style['before']['bytes']
            row = focus_style['after'] if projected else sixth.qualify(row) or focus.qualify(row) or product.qualify(row) or (graph_successor.qualify(row) if graph_successor is not None else None) or row
            raw = current(row['path'])
            assert _hash(raw) == row['sha256'] and len(raw) == row['bytes'], 'changed current Sass source ' + row['path']
            return raw
        initial_version = json.loads(_physical(root, 'projects/ngx-material-legacy/package.json'))['version']
        initial_line = '21.x' if initial_version.startswith('21.') else 'main' if initial_version.startswith('22.') else None
        Product = (_verified_helper(root,'scripts/select_dialog_finite_source_successor_v7.py',
                    'a2c48f99f36b027c9a90ae1fdd8348f507c98b538df8f9426b096de1d5d16ae4','SelectDialogFiniteSourceV7')
                   if initial_line=='main' else SelectDialogFiniteSourceV4)
        product = Product(root, read=read, line=initial_line)
        Focus = (_verified_helper(root, 'scripts/dialog_focus_finite_source_successor_v6.py', '9fad0c4fe637b283fa7dee92335271b1e06a393573ab634995b408807e3bf45a', 'DialogFocusFiniteSourceV6') if initial_line=='main' else _verified_helper(root, 'scripts/dialog_focus_finite_source_successor_v5.py', '75b912981d5ea107b1b56736b26543601574cbf549bec19e667d4987afce5778', 'DialogFocusFiniteSourceV5'))
        Sixth = (_verified_helper(root, 'scripts/stepper_current_peer_source_v5.py',
                                  'f03cab7c899f19bb0f58189ea5355871c47cbe8773b4d6a9466204ca997273c7', 'StepperCurrentPeerSourceV4')
                 if initial_line == 'main' else _verified_helper(root, 'scripts/stepper_sixth_source.py',
                                  '3b6408d97f09d887686952600844c306ad434d1f626cc6a4b74701b536ce79d7', 'StepperSixthSource'))
        focus = Focus(root, read=read, line=initial_line)
        sixth = Sixth(root, read=read)
        for owner in (product, focus, sixth):
            for row in owner.bound:
                if row['path'] in bound:
                    assert bound[row['path']] == row
                else:
                    bound[row['path']] = dict(row)
        if initial_line=='main':
            Graph=_verified_helper(root,'scripts/main_sass_graph_successor.py','164986a1d3bb0d3f753b7e8102dcb718811d74684cb298d23b3ae0f12a67ee4e','MainSassGraphSuccessor')
            current('scripts/main_sass_graph_successor.py')
            graph_successor=Graph(root,read)
            for row in graph_successor.bound.values():
                if row['path'] in bound: assert bound[row['path']]==row
                else: bound[row['path']]=dict(row)
        if initial_line == 'main':
            for path,digest,size in [('scripts/select-dialog-finite-source-v6.mjs','4bd50817e745cf5c1e410a1a4c2b28726d95529f6d9df7a4d2bf953fddc8560a',15483),('scripts/select-dialog-finite-source-successor.mjs','1f58566ca39877ed180af58172aa040851a1f992f039f16ec9de7ea10809d929',12305)]:
                helper_bytes=current(path);assert _hash(helper_bytes)==digest and len(helper_bytes)==size
            helper = 'scripts/stepper-current-peer-source-v5.mjs'
            helper_raw = current(helper)
            assert _hash(helper_raw) == 'ed58eb7eabd2039a48321ec1c3037f42031dd68880795929a440283c5fbf659a' and len(helper_raw)==16963
            old_js=current('scripts/stepper-current-peer-source-v4.mjs');assert _hash(old_js)=='9ed4857d9f5235f36d652284a3bf435dc8cf545500f314e3189f5f743c08d6a1' and len(old_js)==14887
        if initial_line=='main':
            packet_raw=current(FOCUS_STYLE_PACKET['path']);assert _ref(FOCUS_STYLE_PACKET['path'],packet_raw)==FOCUS_STYLE_PACKET;focus_style=json.loads(packet_raw)
            assert focus_style['schema_version']==1 and focus_style['role']=='finite-current-main-strong-focus-source' and focus_style['source_scope_only'] is True
            assert focus_style['parent']=='d74c0d083077f227ea237aff33f42f6c75e76214' and focus_style['commit']=='e1848d4e3a04b31cbb616f16b77d80525f6a7a5c'
            assert focus_style['before']['path']=='projects/ngx-material-legacy/styles/core/focus-indicators/_focus-indicators.scss' and focus_style['after']['path']==focus_style['before']['path']
            env=dict(PATH=os.environ.get('PATH',''),LANG='C',LC_ALL='C',GIT_CONFIG_GLOBAL='/dev/null',GIT_CONFIG_SYSTEM='/dev/null',GIT_TERMINAL_PROMPT='0',GIT_NO_REPLACE_OBJECTS='1',GIT_NO_LAZY_FETCH='1')
            def git(*args):return subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',*args],cwd=root,env=env)
            assert git('rev-list','--parents','-n','1',focus_style['commit']).decode().strip()==focus_style['commit']+' '+focus_style['parent']
            git_style_before=git('show',focus_style['parent']+':'+focus_style['before']['path']);after=git('show',focus_style['commit']+':'+focus_style['after']['path'])
            assert _ref(focus_style['before']['path'],git_style_before)==focus_style['before'] and _ref(focus_style['after']['path'],after)==focus_style['after'] and current(focus_style['after']['path'])==after
            assert _ref(focus_style['review']['path'],current(focus_style['review']['path']))==focus_style['review']
        assert current(SELF) == _IMAGE
        member(SOURCE_JS)
        raw = current(INPUTS)
        assert _hash(raw) == INPUTS_SHA
        packet = json.loads(raw)
        assert packet['schema_version'] == 2 and packet['css_admission_granted'] is False
        assert [row['path'] for row in packet['additional_modules']] == ADDITIONAL
        prior_profile = packet['prior_four_module_profile']
        prior_packet = json.loads(member(prior_profile['packet']))
        assert prior_packet['schema_version'] == 1
        assert prior_packet['product_paths'] == packet['product_paths'][:4]
        assert prior_packet['additional_modules'] == packet['additional_modules'][:2]
        assert packet['historical_non_target_reclassified_as_target'] == [CARD]
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
        assert line is not None and line == initial_line
        source, branch = base['branches'][line], packet['branches'][line]
        member(css['branches'][line]['observation'])
        assert branch['minimum_versions'] == source['minimum_versions']
        assert len(source['inputs']) == branch['historical_loaded_input_count']
        assert len(source['unchanged_owned_sass_before_inputs']) == branch['unchanged_owned_before_count']
        assert branch['new_loaded_edges'] == []
        assert packet['product_paths'] == [row['path'] for row in source['modules']] + ADDITIONAL
        assert branch['current_unchanged_owned_before_count'] == len(source['unchanged_owned_sass_before_inputs']) - len(ADDITIONAL)
        historical = _historical_blobs(root, source, prior_profile['branches'][line])
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
        sixth_transition = sixth.transition
        assert sixth_transition['path'] not in changes
        changes[sixth_transition['path']] = sixth_transition
        if focus_style:
            assert historical[focus_style['before']['path']]==git_style_before
            changes[focus_style['before']['path']]=dict(path=focus_style['before']['path'],before=focus_style['before'],current=focus_style['after'])
        for row in source['inputs']:
            if graph_successor is None or row['path'] not in graph_successor.removed: member(changes[row['path']]['current'] if row['path'] in changes else row)
        member(source['semantic_receipt'])
        for row in source['unchanged_owned_sass_before_inputs']:
            actual = member(changes[row['path']]['current'] if row['path'] in changes else row)
            if row['path'] not in changes:
                assert actual == historical[row['path']]
        for row in protected_packet['branches'][line]['protected_inputs']:
            if graph_successor is None or row['path'] not in graph_successor.removed: member(row)
        graph = next(row for row in census['lines'] if row['line'] == line)
        assert len(graph['non_target_owned_style_template_graph']) == graph['non_target_graph_count']
        assert graph['non_target_graph_count'] == branch['historical_non_target_graph_count']
        assert branch['current_non_target_graph_count'] == graph['non_target_graph_count'] - 1
        assert [row for row in graph['non_target_owned_style_template_graph'] if row['path'] == CARD] == [changes[CARD]['before']]
        for row in graph['non_target_owned_style_template_graph']:
            member(changes[CARD]['current'] if row['path'] == CARD else row)
        transitions = [dict(path=row['path'], before=row['before'], current=row['current']) for row in source['modules'] + packet['additional_modules']] + [sixth_transition] + ([dict(path=focus_style['before']['path'],before=focus_style['before'],current=focus_style['after'])] if focus_style else [])
        for row in transitions:
            member(row['current'])
        source_sets, source_set_successors = {}, []
        for key, rows in css['branches'][line]['source_sets'].items():
            assert _hash(json.dumps(rows, separators=(',', ':')).encode()) == key
            current_rows = []
            for row in rows:
                path='projects/ngx-material-legacy/' + row['path']
                changed = changes.get(path) if row['root'] == 0 and (not focus_style or path!=focus_style['before']['path']) else None
                current_rows.append(dict(row, sha256=changed['current']['sha256'], bytes=changed['current']['bytes']) if changed else dict(row))
            current_hash = _hash(json.dumps(current_rows, separators=(',', ':')).encode())
            assert key == sixth.source_set['historical_sha256']
            assert current_hash == sixth.source_set.get('current_sha256',sixth.source_set['v3_current_sha256'])
            assert current_rows == sixth.source_set['rows']
            final_rows,final_hash=current_rows,current_hash
            if focus_style:
                assert current_hash==focus_style['source_set_before'];seen=0;final_rows=[]
                for row in current_rows:
                    if row['root']==0 and 'projects/ngx-material-legacy/'+row['path']==focus_style['before']['path']:
                        seen+=1;assert row['sha256']==focus_style['before']['sha256'] and row['bytes']==focus_style['before']['bytes'];row=dict(row,sha256=focus_style['after']['sha256'],bytes=focus_style['after']['bytes'])
                    final_rows.append(row)
                assert seen==1;final_hash=_hash(json.dumps(final_rows,separators=(',',':')).encode());assert final_hash==focus_style['source_set_after']
            source_sets[final_hash] = final_rows
            source_set_successors.append(dict(historical_sha256=key, current_sha256=final_hash))
        def assert_current():
            for row in list(bound.values()):
                member(row)
            assert_physical()
        descriptor = dict(source_subject=dict(SOURCE_JS), source_packet=_ref(INPUTS, raw), source_modules=[row['current'] for row in transitions])
        _STATES[self] = dict(root=root, line=line, bound=bound, transitions=transitions, source_sets=source_sets, source_set_successors=source_set_successors,
                             descriptor=descriptor, historical=historical, sixth=sixth, assert_current=assert_current, assert_physical=assert_physical)
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
        sixth_match = state['sixth'].qualify(original) if row['path'] == state['sixth'].transition['path'] else None
        selected = sixth_match or next((value for value in (row['before'], row['current']) if value['sha256'] == original['sha256']), None)
        assert selected is not None, 'unknown owned source hash'
        assert sixth_match is not None or 'bytes' not in original or original['bytes'] == selected['bytes']
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
