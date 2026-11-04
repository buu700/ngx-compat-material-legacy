# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent finite positioned CSS comparator; packed integration is separate."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import weakref

ROOT = Path(__file__).resolve().parents[1]
SELF = 'scripts/sass_spinner_snack_bridge_admission.py'
INPUTS = 'compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json'
INPUTS_SHA = 'fd78f8c7f6e072fb7393c61aef782ccdf3a1c8d009227d08b29921ea2809e0a8'
_IMAGE = (ROOT / SELF).read_bytes()
_RAW = (ROOT / INPUTS).read_bytes()
def _hash(raw):
    return hashlib.sha256(raw.encode() if type(raw) is str else raw).hexdigest()
assert _hash(_RAW) == INPUTS_SHA
_PACKET = json.loads(_RAW)
_CONTEXTS = weakref.WeakKeyDictionary()
SPINNER_SNACK_BRIDGE_CONTRACT = 'historical-spinner-snack-css-with-positioned-public-tokens'
SPINNER_SNACK_BRIDGE_CASES = tuple([
    'mixin-css/progress-spinner-color', 'mixin-css/progress-spinner-theme',
    'mixin-css/snack-bar-color', 'mixin-css/snack-bar-theme', 'mixin-css/snack-bar-typography',
] + ['mixin-argument/' + value for value in [
    'progress-spinner-color/custom-full-theme', 'progress-spinner-color/raw-color-config',
    'progress-spinner-theme/custom-full-theme', 'progress-spinner-theme/custom-dark-theme',
    'snack-bar-color/custom-full-theme', 'snack-bar-color/raw-color-config',
    'snack-bar-theme/custom-full-theme', 'snack-bar-theme/custom-dark-theme',
    'snack-bar-typography/custom-full-theme', 'snack-bar-typography/raw-typography-config',
]])
for _branch in _PACKET['branches'].values():
    assert tuple(row['case_id'] for row in _branch['cases']) == SPINNER_SNACK_BRIDGE_CASES

def _plain(value):
    if type(value) in (str, bool, int) or value is None:
        return value
    if type(value) is list:
        return [_plain(child) for child in value]
    assert type(value) is dict and all(type(key) is str for key in value)
    return {key: _plain(child) for key, child in value.items()}

def _measurement(value):
    return (type(value) is dict and type(value.get('css')) is str
            and value.get('css_sha256') == _hash(value['css'])
            and type(value.get('css_bytes')) is int and value['css_bytes'] == len(value['css'].encode()))

def spinner_snack_positioned_token_css(*, family, dimension, original_css):
    """Caller authenticates before CSS; model only exact known selector/slot order."""
    try:
        assert type(original_css) is str
        scope = next(prefix for prefix in ('.sass-api-probe', '.sass-argument-probe')
                     if original_css.startswith(prefix + ' '))
        value = r'([^;\r\n{}]+)'
        selector = re.escape(scope + ' .mat-mdc-' + ('progress-spinner' if family == 'progress-spinner' else 'snack-bar-container'))
        if family == 'progress-spinner':
            assert dimension in ('color', 'theme')
            rules = [selector + re.escape(variant) + r' \{\n  --mdc-circular-progress-active-indicator-color: ' + value + r';\n\}'
                     for variant in ('', '.mat-accent', '.mat-warn')]
            assert re.fullmatch(r'\n'.join(rules), original_css)
            return re.sub(r'(  --mdc-circular-progress-active-indicator-color: ([^;\r\n{}]+);\n)',
                          lambda match: match[1] + '  --mat-progress-spinner-active-indicator-color: ' + match[2] + ';\n', original_css)
        assert family == 'snack-bar' and dimension in ('color', 'typography', 'theme')
        color = (r'  --mdc-snackbar-container-color: ' + value + r';\n  --mdc-snackbar-supporting-text-color: '
                 + value + r';\n  --mat-snack-bar-button-color: ' + value + r';\n')
        typography = ''.join('  --mdc-snackbar-supporting-text-' + name + ': ' + value + r';\n'
                             for name in ('font', 'line-height', 'size', 'weight'))
        def rule(body):
            return selector + r' \{\n' + body + r'\}'
        pattern = rule(color) + r'\n' + rule(typography) if dimension == 'theme' else rule(color if dimension == 'color' else typography)
        assert re.fullmatch(pattern, original_css)
        result = original_css
        if dimension != 'typography':
            result = re.sub(r'(  --mdc-snackbar-container-color: ([^;\r\n{}]+);\n  --mdc-snackbar-supporting-text-color: ([^;\r\n{}]+);\n)',
                            lambda match: match[1] + '  --mat-snack-bar-container-color: ' + match[2] + ';\n  --mat-snack-bar-supporting-text-color: ' + match[3] + ';\n', result, count=1)
        if dimension != 'color':
            result = re.sub(r'(  --mdc-snackbar-supporting-text-font: ([^;\r\n{}]+);\n  --mdc-snackbar-supporting-text-line-height: ([^;\r\n{}]+);\n  --mdc-snackbar-supporting-text-size: ([^;\r\n{}]+);\n  --mdc-snackbar-supporting-text-weight: ([^;\r\n{}]+);\n)',
                            lambda match: match[1] + ''.join('  --mat-snack-bar-supporting-text-' + name + ': ' + match[index + 2] + ';\n'
                                for index, name in enumerate(('font', 'line-height', 'size', 'weight'))), result, count=1)
        return result
    except (AssertionError, TypeError, ValueError, StopIteration):
        return None

def spinner_snack_positioned_token_results_match(*, family, dimension, original, actual):
    try:
        original, actual = _plain(original), _plain(actual)
        expected = spinner_snack_positioned_token_css(family=family, dimension=dimension, original_css=original['css'])
        return expected is not None and _measurement(original) and _measurement(actual) and actual['css'] == expected
    except (AssertionError, KeyError, TypeError, ValueError):
        return False

def _selected(case_id, line):
    assert line in _PACKET['branches']
    return next(row for row in _PACKET['branches'][line]['cases'] if row['case_id'] == case_id)

def spinner_snack_bridge_expected_css(*, case_id, line, original):
    try:
        row, original = _selected(case_id, line), _plain(original)
        assert _measurement(original) and original['css_sha256'] == row['original_sha256'] and original['css_bytes'] == row['original_bytes']
        family = 'progress-spinner' if row['mixin'].startswith('progress-spinner-') else 'snack-bar'
        return spinner_snack_positioned_token_css(family=family, dimension=row['mixin'][len(family) + 1:], original_css=original['css'])
    except (AssertionError, KeyError, TypeError, ValueError, StopIteration):
        return None

def spinner_snack_bridge_results_match(*, case_id, line, original, actual):
    try:
        actual = _plain(actual)
        expected = spinner_snack_bridge_expected_css(case_id=case_id, line=line, original=original)
        return expected is not None and _measurement(actual) and actual['css'] == expected
    except (AssertionError, KeyError, TypeError, ValueError):
        return False

def _safe(path):
    assert type(path) is str and path and not path.startswith('/') and '\\' not in path and '\0' not in path
    assert all(part and part not in ('.', '..') for part in path.split('/'))

def _physical(root, path):
    _safe(path)
    peer = re.fullmatch(r'node_modules/(@angular/(?:core|material|cdk)|sass)/(.+)', path)
    cursor, parts = root, path.split('/')
    if peer:
        assert not (root / 'node_modules').is_symlink()
        if peer[1].startswith('@angular/'):
            assert not (root / 'node_modules/@angular').is_symlink()
        cursor = (root / 'node_modules' / peer[1]).resolve(strict=True)
        assert json.loads((cursor / 'package.json').read_bytes())['name'] == peer[1]
        parts = peer[2].split('/')
    for part in parts:
        cursor = cursor / part
        assert not cursor.is_symlink()
    assert cursor.is_file()
    return cursor.read_bytes()

def _sources_ok(rows):
    if type(rows) is not list or not rows:
        return False
    try:
        for row in rows:
            _safe(row['path'])
            assert type(row['root']) is int and row['root'] in (0, 1, 2)
            assert re.fullmatch('[0-9a-f]{64}', row['sha256']) and type(row['bytes']) is int and row['bytes'] > 0
        return len({(row['root'], row['path']) for row in rows}) == len(rows)
    except (AssertionError, KeyError, TypeError, ValueError):
        return False

def _git(root, *args, input=None):
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1', GIT_TERMINAL_PROMPT='0', GIT_CONFIG_GLOBAL='/dev/null', GIT_CONFIG_SYSTEM='/dev/null')
    for name in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
        env.pop(name, None)
    return subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', *args], cwd=root, env=env, input=input)

def _git_blob(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()

def _inverse(family, text):
    removals = [("@use '@angular/material' as mat;\n", 1)]
    if family == 'progress-spinner':
        removals += [('    @include mat.progress-spinner-overrides($mdc-circular-progress-color-tokens);\n', 1),
                     ('      @include mat.progress-spinner-overrides((active-indicator-color: $color));\n', 2)]
    else:
        assert family == 'snack-bar'
        removals += [('    @include mat.snack-bar-overrides(tokens-mdc-snack-bar.get-color-tokens($config));\n', 1),
                     ('    @include mat.snack-bar-overrides(tokens-mdc-snack-bar.get-typography-tokens($config));\n', 1)]
    for needle, count in removals:
        assert text.count(needle) == count
        text = text.replace(needle, '')
    return text.encode()

class SpinnerSnackBridgeContract:
    """Physical source context; this object alone grants no assertion approval."""
    __slots__ = ('__weakref__',)
    def __init__(self, root=ROOT, *, read=None):
        root = Path(root).absolute()
        assert root.is_dir() and not root.is_symlink()
        bound = {}
        def member(path, expected=None):
            raw = _physical(root, path)
            if read is not None:
                provided = read(path)
                assert type(provided) is bytes and provided == raw
            current = {'path': path, 'sha256': _hash(raw), 'bytes': len(raw)}
            if expected is not None:
                assert current['sha256'] == expected['sha256'] and current['bytes'] == expected['bytes']
            if path in bound:
                assert current == bound[path]
            else:
                bound[path] = current
            return raw
        assert member(SELF) == _IMAGE
        member(INPUTS, {'sha256': INPUTS_SHA, 'bytes': len(_RAW)})
        for name in ('oracle', 'catalog', 'provenance', 'reference_lock', 'source_subject', 'source_packet'):
            member(_PACKET[name]['path'], _PACKET[name])
        for value in _PACKET['compiler_inputs']:
            member(value['path'], value)
        version = json.loads(member('projects/ngx-material-legacy/package.json'))['version']
        line = '21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None
        assert line is not None
        branch = _PACKET['branches'][line]
        source = json.loads(member(_PACKET['source_packet']['path']))['branches'][line]
        for value in source['inputs']:
            member(value['path'], value)
        member(source['semantic_receipt']['path'], source['semantic_receipt'])
        for name, version in branch['minimum_versions'].items():
            assert json.loads(member('node_modules/@angular/' + name + '/package.json'))['version'] == version
        assert json.loads(member('package.json'))['devDependencies']['sass'] == '1.104.1'
        assert json.loads(member('toolchain-lock.json'))['repository']['node'] == '24.21.0'
        member(branch['observation']['path'], branch['observation'])
        commit = _git(root, 'cat-file', 'commit', source['before_commit'])
        assert hashlib.sha1(b'commit ' + str(len(commit)).encode() + b'\0' + commit).hexdigest() == source['before_commit']
        assert _hash(commit) == source['before_commit_sha256'] and commit.startswith(('tree ' + source['before_tree'] + '\n').encode())
        # Derive all286before source blobs independently; no old code executes.
        refs = [{'path': row['path'], **row['before']} for row in source['modules']] + source['unchanged_owned_sass_before_inputs']
        response = _git(root, 'cat-file', '--batch', input=('\n'.join(source['before_commit'] + ':' + row['path'] for row in refs) + '\n').encode())
        cursor, before = 0, {}
        for row in refs:
            end = response.index(b'\n', cursor)
            blob, kind, size = response[cursor:end].decode().split(' ')
            size = int(size)
            raw = response[end + 1:end + 1 + size]
            assert kind == 'blob' and len(raw) == size and response[end + 1 + size] == 10
            assert blob == row['blob'] == _git_blob(raw) and _hash(raw) == row['sha256'] and size == row['bytes']
            before[row['path']] = raw
            cursor = end + 2 + size
        assert cursor == len(response)
        for row in source['unchanged_owned_sass_before_inputs']:
            assert member(row['path'], row) == before[row['path']]
        for row in source['modules']:
            assert _inverse(row['family'], member(row['path'], row['current']).decode()) == before[row['path']]
            tagged = row['tagged']['body'].encode()
            assert _git_blob(tagged) == row['tagged']['blob'] and _hash(tagged) == row['tagged']['sha256']
            assert before[row['path']] == tagged.replace(b"'@material/", b"'../vendor/mdc/")
        oracle = json.loads(member(_PACKET['oracle']['path']))
        catalog = json.loads(member(_PACKET['catalog']['path']))
        provenance = json.loads(member(_PACKET['provenance']['path']))
        lock = json.loads(member(_PACKET['reference_lock']['path']))
        for row in branch['cases']:
            default = row['case_id'].startswith('mixin-css/')
            setup = oracle['standard_theme'] if default else catalog['setup']
            assert _hash(setup) == row['setup_sha256']
            assert _hash("@use '__entry__' as m;\n" + setup + '\n' + row['call'] + '\n') == row['program_sha256']
            if default:
                assert oracle['members']['mixins'][row['mixin']]['invocation']['css_sha256'] == row['original_sha256']
            else:
                probe = next(value for value in catalog['cases'] if value['case_id'] == row['case_id'])
                assert (probe['mixin'], probe['variant'], probe['call']) == (row['mixin'], row['variant'], row['call'])
            sources = branch['source_sets'][row['source_set_sha256']]
            assert _sources_ok(sources) and _hash(json.dumps(sources, separators=(',', ':'))) == row['source_set_sha256']
            for value in sources:
                path = ('projects/ngx-material-legacy/', 'node_modules/@angular/material/', 'node_modules/@angular/cdk/')[value['root']] + value['path']
                member(path, value)
        def assert_current():
            for value in list(bound.values()):
                member(value['path'], value)
        _CONTEXTS[self] = dict(line=line, branch=branch, bound=bound, assert_current=assert_current,
                              oracle=oracle, catalog=catalog, provenance=provenance, lock=lock)
        assert_current()
    @property
    def line(self):
        return _CONTEXTS[self]['line']
    def assert_current(self):
        _CONTEXTS[self]['assert_current']()

def spinner_snack_bridge_assertion_ok(*, context, body, active, invocation):
    try:
        assert type(context) is SpinnerSnackBridgeContract and context in _CONTEXTS
        state = _CONTEXTS[context]
        snapshot = _plain(dict(body=body, active=active, invocation=invocation))
        b, a = snapshot['body'], snapshot['active']
        line = state['line']
        row = _selected(b['case_id'], line)
        envelope = dict(kind='assertion', check_id='sass-seal', group='sass-api-and-values', result='pass', exit_code=0,
                        line=line, run_id=a['manifest']['run_id'], invocation_id=invocation, binding=a['binding'], mutation_rejected=True, error=None)
        assert all(type(b.get(key)) is type(value) and b.get(key) == value for key, value in envelope.items())
        assert a['binding']['source_line'] == line and type(a['manifest']['run_id']) is str and a['manifest']['run_id']
        assert a['binding']['run_id'] == a['manifest']['run_id'] and a['manifest']['source']['line'] == line
        for key, name in [('source_commit', 'commit'), ('source_tree', 'git_tree_sha'), ('source_content_sha256', 'content_sha256')]:
            assert a['binding'][key] == a['manifest']['source'][name]
            assert re.fullmatch('[0-9a-f]{64}' if key == 'source_content_sha256' else '[0-9a-f]{40}', a['binding'][key])
        assert a['binding']['artifacts_sha256'] == _hash(json.dumps(a['manifest']['artifacts'], sort_keys=True, separators=(',', ':'), allow_nan=False))
        assert type(invocation) is str and invocation
        library = [value for value in a['manifest']['artifacts'] if value['id'] == 'library']
        assert len(library) == 1 and re.fullmatch('[0-9a-f]{64}', library[0]['sha256'])
        assert b['tarball_sha256'] == library[0]['sha256'] and b['comparison'] == SPINNER_SNACK_BRIDGE_CONTRACT
        assert (b['call'], b['mixin'], b['variant']) == (row['call'], row['mixin'], row['variant'])
        default = row['case_id'].startswith('mixin-css/')
        identity = dict(material_version='16.2.14', material_manifest_sha256=state['provenance']['isolated_environment']['material_manifest_sha256'],
                        lock_sha256=_PACKET['reference_lock']['sha256'], material_integrity=state['lock']['packages']['node_modules/@angular/material']['integrity'],
                        catalog=_PACKET['oracle' if default else 'catalog']['path'], catalog_sha256=_PACKET['oracle' if default else 'catalog']['sha256'],
                        expected_source='untouched-installed-material16', candidate_source='packed-facade', sass_version=state['branch']['compiler'])
        assert b['identity'] == identity
        assert b['current_spinner_snack_bridge'] == dict(contract=SPINNER_SNACK_BRIDGE_CONTRACT, source_line=line,
                   source_subject=_PACKET['source_subject'], source_packet=_PACKET['source_packet'], source_modules=state['branch']['source_modules'], compiler_inputs=_PACKET['compiler_inputs'])
        assert b['expected']['program_sha256'] == b['actual']['program_sha256'] == row['program_sha256']
        assert _sources_ok(b['expected']['sources']) and all(value['root'] == 0 for value in b['expected']['sources'])
        assert dict(root=0, **state['catalog']['original_entry_identity']) in b['expected']['sources']
        assert _sources_ok(b['actual']['sources'])
        assert sorted(b['actual']['sources'], key=lambda value: (value['root'], value['path'])) == state['branch']['source_sets'][row['source_set_sha256']]
        assert spinner_snack_bridge_results_match(case_id=b['case_id'], line=line, original=b['expected'], actual=b['actual'])
        assert 'current_companion' not in b and 'current_peer_alias' not in b
        wrong = b['actual']['css'] + '\n.wrong-nonempty-mixin { color: red; }\n'
        assert b['mutation'] == dict(css=wrong, css_sha256=_hash(wrong), css_bytes=len(wrong.encode()))
        state['assert_current']()
        assert _plain(dict(body=body, active=active, invocation=invocation)) == snapshot
        return True
    except (AssertionError, KeyError, TypeError, ValueError, OSError, StopIteration):
        return False
