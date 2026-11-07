# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent current-source direct15 assertion; the frozen CSS comparator stays pure."""
import copy
import hashlib
import json
from pathlib import Path
import re
import subprocess
import os
import weakref
from current_sass_source import CurrentSassSource
from sass_spinner_snack_bridge_admission import (SPINNER_SNACK_BRIDGE_CASES,
    SPINNER_SNACK_BRIDGE_CONTRACT, spinner_snack_bridge_results_match)

ROOT = Path(__file__).resolve().parents[1]
SELF = 'scripts/current_sass_spinner_snack_admission.py'
INPUTS = 'compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json'
SOURCE_INPUTS = 'compatibility/rc/current-sass-source-inputs-v2.json'
SIXTH_PACKET = 'compatibility/rc/current-sass-stepper-sixth-source-inputs-v1.json'
PINS = [
    ('scripts/current-sass-source.mjs', '5422358f5dfda6cbcd6826fc1d3e887a294d9d5e34ea7093623d71dcb1087d15', 19266),
    ('scripts/current_sass_source.py', '1bf1bd2ff60bf3ee7b1aa44c7e0f443ae0642098cdac8f1d9d81f2aa0587bbbb', 16237),
    (SOURCE_INPUTS, '46e1c8e8657880c1168010c8ec1b5967cbb4aa4c289a4d9b9ae29e3b2182b0a9', 20239),
    ('scripts/sass_spinner_snack_bridge_admission.py', '66a9ad634bede4e0eeef23ece0fe50d49d6fbf28d5bc619da0873d6ec8fae0f3', 19824),
    (SIXTH_PACKET, '1d566395c25e3569cee1031526ec05508e40cb866d7d5fda008cb6a325a9caec', 7504),
    (INPUTS, 'fd78f8c7f6e072fb7393c61aef782ccdf3a1c8d009227d08b29921ea2809e0a8', 237068),
]
_IMAGE = (ROOT / SELF).read_bytes()
_STATES = weakref.WeakKeyDictionary()


def _hash(raw):
    return hashlib.sha256(raw.encode() if type(raw) is str else raw).hexdigest()


def _ref(path, raw):
    return dict(path=path, sha256=_hash(raw), bytes=len(raw))


def _safe(path):
    assert type(path) is str and path and not path.startswith('/') and '\\' not in path and '\0' not in path
    assert all(p and p not in ('.', '..') for p in path.split('/'))


def _physical(root, path):
    _safe(path)
    def regular(base, parts):
        cursor = base
        for p in parts:
            cursor = cursor / p
            assert not cursor.is_symlink()
        assert cursor.is_file()
        return cursor.read_bytes()
    peer = re.fullmatch(r'node_modules/(@angular/(?:core|material|cdk)|sass)/(.+)', path)
    if peer is None:
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


def _plain(value):
    if type(value) is int:
        assert abs(value) <= 9007199254740991
        return value
    if value is None or type(value) in (str, bool):
        return value
    assert type(value) in (list, dict), 'metadata requires built-in JSON values'
    if type(value) is list:
        return [_plain(v) for v in value]
    assert all(type(k) is str for k in value)
    return {k: _plain(v) for k, v in value.items()}


def _sources(rows):
    assert type(rows) is list and rows
    for r in rows:
        _safe(r['path'])
        assert type(r['root']) is int and r['root'] in (0, 1, 2)
        assert type(r['sha256']) is str and re.fullmatch('[0-9a-f]{64}', r['sha256'])
        assert type(r['bytes']) is int and r['bytes'] > 0
    assert len({(r['root'], r['path']) for r in rows}) == len(rows)


def _set_hash(rows):
    return _hash(json.dumps(rows, separators=(',', ':')))


class CurrentSpinnerSnackContract:
    """Private current source context; this object alone grants no artifact admission."""
    __slots__ = ('__weakref__',)

    def __init__(self, root=ROOT, *, read=None):
        root = Path(root).absolute()
        assert root.is_dir() and not root.is_symlink()
        assert read is None or callable(read)
        bound = {}
        def current(path):
            raw = _physical(root, path)
            r = _ref(path, raw)
            if path in bound:
                assert r == bound[path]
            else:
                bound[path] = r
            if read is not None:
                supplied = read(path)
                assert type(supplied) is bytes and supplied == raw, 'nonphysical direct contract input ' + path
            assert _physical(root, path) == raw, 'input changed during callback ' + path
            return raw
        def member(r):
            raw = current(r['path'])
            assert _ref(r['path'], raw) == r
            return raw
        def assert_physical():
            for r in bound.values():
                assert _ref(r['path'], _physical(root, r['path'])) == r
        assert current(SELF) == _IMAGE
        version = json.loads(current('projects/ngx-material-legacy/package.json'))['version']
        main = version.startswith('22.')
        successor = None
        select_successor = None
        if main:
            path = 'compatibility/rc/current-sass-stepper-source-executables-v1.json'
            raw = current(path)
            assert _hash(raw) == '577ca8a935a6f431ed282769be29d84686c109a94faef9174de0091754e59d61'
            successor = json.loads(raw)
            assert successor['schema_version'] == 1 and successor['role'] == 'main-stepper-current-source-executable-successor' and successor['line'] == 'main'
            assert successor['source_parent'] == '42d02491648097656ccb3c590dbaaea066c3e603' and successor['source_scope_only'] is True and successor['artifact_or_audit_admission_granted'] is False
            assert [row['path'] for row in successor['updates']] == ['scripts/current-sass-source.mjs','scripts/current_sass_source.py']
            next_raw=current('compatibility/rc/current-sass-select-source-executables-v2.json');assert _hash(next_raw)=='ca173498329ead35221ef603bcb751699dd18e041cc002eca97c644f87e980a0';select_successor=json.loads(next_raw)
            assert select_successor['schema_version']==2 and select_successor['role']=='main-select-current-source-executable-successor' and select_successor['line']=='main'
            assert select_successor['previous_packet']==_ref(path,raw) and select_successor['source_scope_only'] is True and select_successor['artifact_or_audit_admission_granted'] is False
            assert [r['path'] for r in select_successor['updates']]==[r['path'] for r in successor['updates']]
            assert [r['path'] for r in select_successor['authored_support']]==['scripts/select-dialog-finite-source-v6.mjs','scripts/select_dialog_finite_source_successor_v6.py','compatibility/rc/parent-select-dialog-menu-reviewed-repair-source-v6.json']
            for support in select_successor['authored_support']:assert _ref(support['path'],current(support['path']))==support

            env = dict(PATH=os.environ.get('PATH',''), LANG='C', LC_ALL='C', GIT_CONFIG_GLOBAL='/dev/null', GIT_CONFIG_SYSTEM='/dev/null', GIT_TERMINAL_PROMPT='0', GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1')
            for row in successor['updates']:
                before = subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',successor['source_parent']+':'+row['path']],cwd=root,env=env)
                assert _ref(row['path'],before)==row['before']
                cursor=0;parts=[]
                for edit in row['edits']:
                    assert set(edit)=={'offset','before','after'} and type(edit['offset']) is int and edit['offset']>=cursor
                    old=edit['before'].encode();after=edit['after'].encode();assert before[edit['offset']:edit['offset']+len(old)]==old
                    parts.extend((before[cursor:edit['offset']],after));cursor=edit['offset']+len(old)
                after=b''.join([*parts,before[cursor:]])
                assert _ref(row['path'],after)==row['after']
                next_update=next(item for item in select_successor['updates'] if item['path']==row['path']);assert next_update['before']==row['after'];at=0;next_parts=[]
                for edit in next_update['edits']:
                    assert set(edit)=={'offset','before','after'} and type(edit['offset']) is int and edit['offset']>=at
                    old=edit['before'].encode();value=edit['after'].encode();assert after[edit['offset']:edit['offset']+len(old)]==old
                    next_parts.extend((after[at:edit['offset']],value));at=edit['offset']+len(old)
                physical_after=b''.join([*next_parts,after[at:]])
                assert _ref(row['path'],physical_after)==next_update['after'] and current(row['path'])==physical_after
        for path, sha256, size in PINS:
            update = next((row for row in select_successor['updates'] if row['path']==path),None) if select_successor else None
            member(update['after'] if update else dict(path=path, sha256=sha256, bytes=size))
        packet, current_packet = json.loads(current(INPUTS)), json.loads(current(SOURCE_INPUTS))
        source_context = CurrentSassSource(root, read=current)
        line, branch = source_context.line, packet['branches'][source_context.line]
        assert main == (line == 'main')
        for key in ('oracle', 'catalog', 'provenance', 'reference_lock', 'source_subject', 'source_packet'):
            member(packet[key])
        for r in packet['compiler_inputs']:
            member(r)
        member(branch['observation'])
        base = json.loads(current(packet['source_packet']['path']))
        sixth = json.loads(current(SIXTH_PACKET))
        canonical_source = dict(source_subject=select_successor['updates'][0]['after'] if main else dict(path=PINS[0][0], sha256=PINS[0][1], bytes=PINS[0][2]),
            source_packet=dict(path=SOURCE_INPUTS, sha256=PINS[2][1], bytes=PINS[2][2]),
            source_modules=[r['current'] for r in base['branches'][line]['modules'] + current_packet['additional_modules']] + [json.loads(current('compatibility/rc/current-sass-stepper-current-peer-source-inputs-v4.json'))['transition']['after'] if main else sixth['branches'][line]['reviewed_after']] + ([json.loads(current('compatibility/rc/current-main-strong-focus-source-v1.json'))['after']] if main else []))
        assert source_context.descriptor == canonical_source
        oracle, catalog, provenance, lock = [json.loads(current(packet[k]['path'])) for k in ('oracle', 'catalog', 'provenance', 'reference_lock')]
        assert branch['compiler'] == provenance['sass_info']
        assert tuple(r['case_id'] for r in branch['cases']) == SPINNER_SNACK_BRIDGE_CASES
        successors, current_sets = source_context.source_set_successors, source_context.source_sets
        transitions = {r['path']: r['current'] for r in source_context.transitions}
        assert len(successors) == len(branch['source_sets']) == len(current_sets)
        assert len({r['historical_sha256'] for r in successors}) == len(successors)
        assert len({r['current_sha256'] for r in successors}) == len(successors)
        set_keys = {}
        for historical, rows in branch['source_sets'].items():
            assert _set_hash(rows) == historical
            expected = []
            for r in rows:
                changed = transitions.get('projects/ngx-material-legacy/' + r['path']) if r['root'] == 0 else None
                expected.append(dict(r, sha256=changed['sha256'], bytes=changed['bytes']) if changed else dict(r))
            current_hash = _set_hash(expected)
            assert next(r for r in successors if r['historical_sha256'] == historical) == dict(historical_sha256=historical, current_sha256=current_hash)
            assert current_sets[current_hash] == expected
            _sources(expected)
            set_keys[historical] = current_hash
            for r in expected:
                member(dict(path=('projects/ngx-material-legacy/', 'node_modules/@angular/material/', 'node_modules/@angular/cdk/')[r['root']] + r['path'], sha256=r['sha256'], bytes=r['bytes']))
        for r in branch['cases']:
            default = r['case_id'].startswith('mixin-css/')
            setup = oracle['standard_theme'] if default else catalog['setup']
            assert _hash(setup) == r['setup_sha256']
            assert _hash("@use '__entry__' as m;\n" + setup + '\n' + r['call'] + '\n') == r['program_sha256']
            if default:
                assert oracle['members']['mixins'][r['mixin']]['invocation']['css_sha256'] == r['original_sha256']
            else:
                p = next(p for p in catalog['cases'] if p['case_id'] == r['case_id'])
                assert all(p[k] == r[k] for k in ('mixin', 'variant', 'call'))
            assert r['source_set_sha256'] in set_keys
        def assert_current():
            source_context.assert_current()
            for r in list(bound.values()):
                member(r)
            assert_physical()
        descriptor = _plain(dict(contract=SPINNER_SNACK_BRIDGE_CONTRACT, source_line=line, **canonical_source, compiler_inputs=packet['compiler_inputs']))
        _STATES[self] = dict(root=root, source_context=source_context, line=line, packet=packet, branch=branch,
            set_keys=set_keys, current_sets=current_sets, successors=successors, bound=bound, descriptor=descriptor,
            oracle=oracle, catalog=catalog, provenance=provenance, lock=lock, assert_current=assert_current, assert_physical=assert_physical)
        assert_current()

    @property
    def line(self): return _STATES[self]['line']

    @property
    def root(self): return _STATES[self]['root']

    @property
    def bound(self): return copy.deepcopy(list(_STATES[self]['bound'].values()))

    @property
    def descriptor(self): return copy.deepcopy(_STATES[self]['descriptor'])

    @property
    def source_sets(self): return copy.deepcopy(_STATES[self]['current_sets'])

    @property
    def source_set_successors(self): return copy.deepcopy(_STATES[self]['successors'])

    def assert_current(self): _STATES[self]['assert_current']()


def current_spinner_snack_assertion_ok(*, context, body, active, invocation):
    try:
        assert type(context) is CurrentSpinnerSnackContract and context in _STATES
        s = _STATES[context]
        snapshot = _plain(dict(body=body, active=active, invocation=invocation))
        b, a, invocation_value = snapshot['body'], snapshot['active'], snapshot['invocation']
        row = next(r for r in s['branch']['cases'] if r['case_id'] == b['case_id'])
        envelope = dict(kind='assertion', check_id='sass-seal', group='sass-api-and-values', result='pass', exit_code=0,
            line=s['line'], run_id=a['manifest']['run_id'], invocation_id=invocation_value, binding=a['binding'], mutation_rejected=True, error=None)
        assert all(type(b.get(k)) is type(v) and b.get(k) == v for k, v in envelope.items())
        assert a['binding']['source_line'] == a['manifest']['source']['line'] == s['line']
        assert a['binding']['run_id'] == a['manifest']['run_id'] and type(a['manifest']['run_id']) is str and a['manifest']['run_id']
        assert type(invocation_value) is str and invocation_value
        for key, name in [('source_commit', 'commit'), ('source_tree', 'git_tree_sha'), ('source_content_sha256', 'content_sha256')]:
            assert a['binding'][key] == a['manifest']['source'][name]
            assert re.fullmatch('[0-9a-f]{64}' if key == 'source_content_sha256' else '[0-9a-f]{40}', a['binding'][key])
        assert a['binding']['artifacts_sha256'] == _hash(json.dumps(a['manifest']['artifacts'], sort_keys=True, separators=(',', ':'), allow_nan=False))
        libraries = [r for r in a['manifest']['artifacts'] if r['id'] == 'library']
        assert len(libraries) == 1 and re.fullmatch('[0-9a-f]{64}', libraries[0]['sha256'])
        assert b['tarball_sha256'] == libraries[0]['sha256'] and b['comparison'] == SPINNER_SNACK_BRIDGE_CONTRACT
        assert all(b[k] == row[k] for k in ('call', 'mixin', 'variant'))
        default = b['case_id'].startswith('mixin-css/')
        packet = s['packet']
        identity = dict(material_version='16.2.14', material_manifest_sha256=s['provenance']['isolated_environment']['material_manifest_sha256'],
            lock_sha256=packet['reference_lock']['sha256'], material_integrity=s['lock']['packages']['node_modules/@angular/material']['integrity'],
            catalog=packet['oracle' if default else 'catalog']['path'], catalog_sha256=packet['oracle' if default else 'catalog']['sha256'],
            expected_source='untouched-installed-material16', candidate_source='packed-facade', sass_version=s['branch']['compiler'])
        assert b['identity'] == identity and b['current_spinner_snack_bridge'] == s['descriptor']
        assert b['expected']['program_sha256'] == b['actual']['program_sha256'] == row['program_sha256']
        _sources(b['expected']['sources'])
        assert all(r['root'] == 0 for r in b['expected']['sources'])
        assert dict(root=0, **s['catalog']['original_entry_identity']) in b['expected']['sources']
        _sources(b['actual']['sources'])
        assert sorted(b['actual']['sources'], key=lambda r: (r['root'], r['path'])) == s['current_sets'][s['set_keys'][row['source_set_sha256']]]
        assert 'line' not in b['actual'] or b['actual']['line'] == s['line']
        assert 'sass_version' not in b['actual'] or b['actual']['sass_version'] == s['branch']['compiler']
        assert spinner_snack_bridge_results_match(case_id=b['case_id'], line=s['line'], original=b['expected'], actual=b['actual'])
        assert all(k not in b for k in ('current_companion', 'current_peer_alias', 'current_infrastructure'))
        wrong = b['actual']['css'] + '\n.wrong-nonempty-mixin { color: red; }\n'
        assert b['mutation'] == dict(css=wrong, css_sha256=_hash(wrong), css_bytes=len(wrong.encode()))
        s['assert_current']()
        assert _plain(dict(body=body, active=active, invocation=invocation)) == snapshot
        s['assert_physical']()
        return True
    except (AssertionError, KeyError, TypeError, ValueError, OSError, StopIteration, RecursionError):
        return False
