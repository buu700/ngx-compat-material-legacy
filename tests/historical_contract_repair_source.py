# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent exact source and tool transitions; historical bytes are comparison data."""
import functools
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'compatibility/rc/historical-contract-repair-source-inputs.json'
READERS = 'compatibility/rc/historical-contract-repair-reader-inputs.json'
SOURCE_PINS = {'21.x': 'c1d7a8762cad7913a5d4ad60863afb506c56c61d27a78c17a3f5372c51cc9303',
               'main': 'cee92383ce1cb2c82b135e2e3b8be0131a46b114d60a521f7e11e4d0bb017191'}
READER_PINS = {'21.x': '655b4e39694b5452767604de5c2ce4bb0c0f28ab9632dd82ae390e039964f2d8',
               'main': '8ba8b2652be4ddcff5d7ee1881f351e83922f8a778c1b318434652f833a89e4d'}


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def _read(root, path):
    assert isinstance(path, str) and not path.startswith('/')
    parts = path.split('/')
    assert all(part and part not in ('.', '..') for part in parts)
    cursor = Path(root)
    assert cursor.is_dir() and not cursor.is_symlink()
    for part in parts:
        cursor = cursor / part
        assert not cursor.is_symlink()
    assert cursor.is_file()
    return cursor.read_bytes()


@functools.lru_cache(maxsize=128)
def _decoded(raw):
    return json.loads(raw)


def _registry(root, path, pins):
    version = json.loads(_read(root, 'projects/ngx-material-legacy/package.json'))['version']
    line = '21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None
    assert line is not None
    raw = _read(root, path)
    assert digest(raw) == pins[line]
    data = _decoded(raw)
    assert data['schema_version'] == 1 and data['line'] == line
    assert data['actual_native_packed_browser_floor_or_full_audit_qualified'] is False
    assert data['g11_claim'] == 'not-passed'
    return data


@functools.lru_cache(maxsize=128)
def _original(root, parent, path):
    assert re.fullmatch('[0-9a-f]{40}', parent)
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for name in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(name, None)
    return subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0',
                                   '-c', 'maintenance.auto=0', 'show', parent + ':' + path],
                                  cwd=root, env=env)


def _identity(raw, ref):
    assert digest(raw) == ref['sha256']
    assert len(raw) == ref['bytes']


def _selected(ref, row, extra=()):
    prior = next((side for side in [row['before'], row['after'], *extra]
                  if side['sha256'] == ref['sha256']), None)
    assert prior is not None
    if 'bytes' in ref:
        assert ref['bytes'] == prior['bytes']
    return prior


def _derive_source(root, data, row):
    before = _original(str(root), data['repair_baseline_commit'], row['path'])
    _identity(before, row['before'])
    if row['path'] == 'compatibility/rc/api/signature-differences.json':
        parsed = json.loads(before)
        assert len(parsed['differences']) == 114 and row['literal_edits'] == []
        removed = row['removed_api_exception']
        assert removed['symbol_id'] == 'legacy-form-field/testing/MatLegacyErrorHarness'
        assert removed['owned_signature'] is None
        assert '_getErrorPredicate' in removed['historical_signature']
        assert parsed['differences'].count(removed) == 1
        parsed['differences'].remove(removed)
        expected = (json.dumps(parsed, indent=2) + '\n').encode()
    else:
        expected = before.decode()
        assert row['literal_edits']
        for edit in row['literal_edits']:
            assert expected.count(edit['before']) == 1
            expected = expected.replace(edit['before'], edit['after'])
        expected = expected.encode()
    _identity(expected, row['after'])
    assert _read(root, row['path']) == expected
    return before, expected


def qualify_source_reference(ref, root=ROOT):
    data = _registry(root, SOURCE, SOURCE_PINS)
    assert data['canonical_decisions_changed'] == 0 and data['source_scope_only'] is True
    assert len(data['images']) == 5
    rows = [row for row in data['images'] if row['path'] == ref['path']]
    if not rows:
        return dict(ref)
    assert len(rows) == 1
    row = rows[0]
    _selected(ref, row)
    _derive_source(root, data, row)
    return {**ref, 'sha256': row['after']['sha256'],
            **({'bytes': row['after']['bytes']} if 'bytes' in ref else {})}


def _tool_data(root):
    data = _registry(root, READERS, READER_PINS)
    assert data['canonical_dispositions_changed'] == data['product_changes'] == 0
    assert data['old_programs_executed'] is False
    gate = data.get('gate_tool_successor')
    assert len(data['tool_transitions']) == ((17 if data['line'] == '21.x' else 7) + len(data['c04_source_successor']['added_tool_paths']) + (6 if gate else 0) if data['extension_kind'] == 'spinner-snack-c04-source' else (17 if data['line'] == '21.x' else 7))
    assert len({row['path'] for row in data['tool_transitions']}) == len(data['tool_transitions'])
    ref = data['unchanged_source_subject']
    _identity(_read(root, ref['path']), ref)
    if data['extension_kind'] == 'spinner-snack-c04-source':
        prior = _prior_c04_registry(root, data)
        count = 17 if data['line'] == '21.x' else 7
        assert data['tool_transitions'][:count] == prior['tool_transitions']
        end = count + len(data['c04_source_successor']['added_tool_paths'])
        assert [r['path'] for r in data['tool_transitions'][count:end]] == data['c04_source_successor']['added_tool_paths']
        assert all(r['source_parent'] == data['prior_reader_registry']['source_parent'] for r in data['tool_transitions'][count:end])
        scope = data['c04_source_successor']
        assert scope['historical_owned_scss_rows'] == 409 and scope['historical_report_rewrites'] == 0
        assert scope['old_product_read_callback'] is False
        assert scope['historical_boundaries'] == 4 and scope['current_boundaries'] == 6
        assert scope['ordinary_all_legacy_companions'] == 13
        assert scope['physical_product_paths'] == list(SPINNER_SNACK_PATHS)
        assert [r['path'] for r in data['support_inputs']] == ['scripts/sass-spinner-snack-c04-source.mjs', 'scripts/sass-spinner-snack-bridge-contract.mjs'] + (['scripts/sass-spinner-snack-gate-integration.mjs', 'scripts/sass_spinner_snack_gate_integration.py'] if gate else [])
        for ref in data['support_inputs']:
            _identity(_read(root, ref['path']), ref)
    elif data['line'] == '21.x':
        assert data['extension_kind'] == 'packed-owner-source-lanes'
        prior_ref = data['prior_reader_registry']
        assert prior_ref['path'] == READERS
        assert prior_ref['sha256'] == '3af8b447d98b9d0bde687d83399e8c625604dbefa78b00535e142b063d8482f3'
        assert prior_ref['bytes'] == 55559
        raw = _original(str(root), prior_ref['source_parent'], READERS)
        _identity(raw, prior_ref)
        prior = _decoded(raw)
        assert prior['line'] == data['line'] and prior['source_parent'] == data['source_parent']
        assert len(prior['tool_transitions']) == 15
        old_paths = {row['path'] for row in prior['tool_transitions']}
        assert [row['path'] for row in data['tool_transitions'] if row['path'] not in old_paths] == [
            'scripts/packed-upstream-ledger-base.mjs', 'scripts/checker-reference-metadata.mjs']
        for old in prior['tool_transitions']:
            current = next(row for row in data['tool_transitions'] if row['path'] == old['path'])
            if old['path'] == 'scripts/packed-upstream-ledger-epoch.mjs':
                assert current['literal_edits'][:len(old['literal_edits'])] == old['literal_edits']
                assert {**current, 'literal_edits': old['literal_edits'], 'after': old['after']} == old
                assert old['after'] == {'sha256': '34a8c062367debddf81a5112be37e4aa603e4a3c6b9c8e5c7c34144995d62669', 'bytes': 74930}
            else:
                assert current == old
    if gate:
        assert data['extension_kind'] == 'spinner-snack-c04-source'
        prior = _prior_gate_registry(root, data)
        count = 39 if data['line'] == '21.x' else 11
        assert data['c04_source_successor'] == prior['c04_source_successor']
        assert data['prior_reader_registry'] == prior['prior_reader_registry']
        support = gate['rolled_forward_c04_support']
        assert support['path'] == 'scripts/sass-spinner-snack-c04-source.mjs'
        assert support['source_parent'] == gate['prior_reader_registry']['source_parent']
        assert support['before'] == prior['support_inputs'][0]
        assert support['after'] == data['support_inputs'][0]
        assert data['support_inputs'][1] == prior['support_inputs'][1]
        support_before = _original(str(root), support['source_parent'], support['path'])
        _identity(support_before, support['before'])
        support_text = support_before.decode()
        assert support['literal_edits']
        for edit in support['literal_edits']:
            assert support_text.count(edit['before']) == 1
            support_text = support_text.replace(edit['before'], edit['after'])
        _identity(support_text.encode(), support['after'])
        paths = ['scripts/sass-seal.mjs', 'scripts/sass-api-inventory.mjs', 'scripts/sass-mixin-arguments.mjs', 'scripts/sass_mixin_argument_admission.py', 'scripts/rc-verify.py', 'scripts/sass-api-regressions.mjs']
        assert gate['added_tool_paths'] == paths
        assert [r['path'] for r in data['tool_transitions'][count:]] == paths
        assert all(r['source_parent'] == gate['prior_reader_registry']['source_parent'] for r in data['tool_transitions'][count:])
        for old, current in zip(prior['tool_transitions'], data['tool_transitions'][:count]):
            if data['line'] == '21.x' and old['path'] == 'tests/test_historical_contract_repair_source.py':
                proof = gate['rolled_forward_test']
                assert proof['path'] == old['path'] and proof['source_parent'] == gate['prior_reader_registry']['source_parent']
                assert proof['before'] == old['after'] and proof['after'] == current['after']
                assert current['literal_edits'][:len(old['literal_edits'])] == old['literal_edits']
                assert current['literal_edits'][len(old['literal_edits']):] == proof['literal_edits']
                assert {**current, 'after': old['after'], 'literal_edits': old['literal_edits']} == old
                raw = _original(str(root), proof['source_parent'], proof['path'])
                _identity(raw, proof['before'])
                text = raw.decode()
                assert len(proof['literal_edits']) == 2
                for edit in proof['literal_edits']:
                    assert text.count(edit['before']) == 1
                    text = text.replace(edit['before'], edit['after'])
                _identity(text.encode(), proof['after'])
            else:
                assert current == old
        if data['line'] == 'main':
            assert gate['rolled_forward_test'] is None
        assert gate['old_reports_rewritten'] == gate['canonical_dispositions_changed'] == 0
        assert gate['old_product_reader'] is gate['current_artifact_or_rendering_qualified'] is False
    return data


def _tool_intermediate(root, data, row):
    if data['line'] != '21.x' or row['path'] != 'scripts/packed-upstream-ledger-epoch.mjs':
        return None
    if data['extension_kind'] == 'spinner-snack-c04-source':
        data = _prior_c04_registry(root, data)
    prior_ref = data['prior_reader_registry']
    raw = _original(str(root), prior_ref['source_parent'], READERS)
    _identity(raw, prior_ref)
    prior = _decoded(raw)
    old = next(item for item in prior['tool_transitions'] if item['path'] == row['path'])
    reference = old['after']
    assert reference == {'sha256': '34a8c062367debddf81a5112be37e4aa603e4a3c6b9c8e5c7c34144995d62669', 'bytes': 74930}
    image = _original(str(root), prior_ref['source_parent'], row['path'])
    _identity(image, reference)
    return reference, image


def _derive_tool(root, data, row):
    assert re.fullmatch(r'(?:scripts/[^/]+\.(?:mjs|cjs)|tests/[^/]+\.(?:py|mjs))', row['path']) or (data.get('gate_tool_successor') and row['path'] in ['scripts/sass_mixin_argument_admission.py', 'scripts/rc-verify.py'])
    before = _original(str(root), row.get('source_parent', data['source_parent']), row['path'])
    _identity(before, row['before'])
    expected = before.decode()
    assert row['literal_edits']
    for edit in row['literal_edits']:
        assert expected.count(edit['before']) == 1
        expected = expected.replace(edit['before'], edit['after'])
    after = expected.encode()
    _identity(after, row['after'])
    assert _read(root, row['path']) == after
    return before, after


def qualify_tool_reference(ref, root=ROOT):
    if any((Path(root) / path).is_file() for path in ('compatibility/rc/parent-base-class-tool-successor-inputs-v3.json', 'compatibility/rc/current-sass-tool-reference-inputs-v2.json')):
        tools = _current_tool_subject(root)
        selected = tools.qualify(ref)
        if selected is None:
            assert ref['path'] not in {row['path'] for row in tools.transitions}, 'unknown owned current tool hash'
            return dict(ref)
        return selected
    data = _tool_data(root)
    rows = [row for row in data['tool_transitions'] if row['path'] == ref['path']]
    if not rows:
        return dict(ref)
    assert len(rows) == 1
    row = rows[0]
    intermediate = _tool_intermediate(root, data, row)
    _selected(ref, row, [intermediate[0]] if intermediate else [])
    _derive_tool(root, data, row)
    return {**ref, 'sha256': row['after']['sha256'],
            **({'bytes': row['after']['bytes']} if 'bytes' in ref else {})}


def tool_comparison_bytes(ref, root=ROOT):
    if any((Path(root) / path).is_file() for path in ('compatibility/rc/parent-base-class-tool-successor-inputs-v3.json', 'compatibility/rc/current-sass-tool-reference-inputs-v2.json')):
        tools = _current_tool_subject(root)
        if ref['path'] in {row['path'] for row in tools.transitions}:
            return tools.comparison_bytes(ref)
        raw = _read(root, ref['path'])
        assert digest(raw) == ref['sha256']
        if 'bytes' in ref:
            assert len(raw) == ref['bytes']
        return raw
    data = _tool_data(root)
    rows = [row for row in data['tool_transitions'] if row['path'] == ref['path']]
    if not rows:
        raw = _read(root, ref['path'])
        assert digest(raw) == ref['sha256']
        if 'bytes' in ref:
            assert len(raw) == ref['bytes']
        return raw
    assert len(rows) == 1
    row = rows[0]
    intermediate = _tool_intermediate(root, data, row)
    prior = _selected(ref, row, [intermediate[0]] if intermediate else [])
    before, after = _derive_tool(root, data, row)
    if intermediate and prior == intermediate[0]:
        return intermediate[1]
    return before if prior == row['before'] else after


SPINNER_SNACK_PATHS = (
    'projects/ngx-material-legacy/styles/progress-spinner/_progress-spinner-theme.scss',
    'projects/ngx-material-legacy/styles/snack-bar/_snack-bar-theme.scss')


def _prior_gate_registry(root, data):
    ref = data['gate_tool_successor']['prior_reader_registry']
    pins = {'21.x': {'sha256': 'a16f2e253cb34efb9963eadcf921977f2d8464c468797faad5c2dca580b13f35', 'bytes': 333345, 'source_parent': 'af07cb6311c960de054dcf16e2d29ad65f6138f5'}, 'main': {'sha256': 'ab76e4170d669a5f7cea18ffcd33d91b05c954572ae96ad65ca9158f5dea9a14', 'bytes': 67365, 'source_parent': '99aa39254e87bd215d2f3ed7d6821236e9bb483d'}}
    assert ref == {'path': READERS, **pins[data['line']]}
    raw = _original(str(root), ref['source_parent'], READERS)
    _identity(raw, ref)
    prior = _decoded(raw)
    assert prior['line'] == data['line'] and prior['source_parent'] == data['source_parent']
    assert prior['extension_kind'] == 'spinner-snack-c04-source' and 'gate_tool_successor' not in prior
    assert len(prior['tool_transitions']) == (39 if data['line'] == '21.x' else 11)
    return prior


def _prior_c04_registry(root, data):
    ref = data['prior_reader_registry']
    pin = {'21.x': ('577d690ecdad79da270dda15a73649c519e5f9444f9e0a0739d94aecefa45a90', 172038),
           'main': ('702d6f65109297515ee1fc57810eaf8fe0a9f7148742ff8572d90824d57b2944', 29767)}[data['line']]
    assert ref['path'] == READERS and (ref['sha256'], ref['bytes']) == pin
    raw = _original(str(root), ref['source_parent'], READERS)
    _identity(raw, ref)
    prior = _decoded(raw)
    assert prior['line'] == data['line'] and prior['source_parent'] == data['source_parent']
    assert len(prior['tool_transitions']) == (17 if data['line'] == '21.x' else 7)
    return prior


def qualify_spinner_snack_source_reference(ref, root=ROOT):
    if any((Path(root) / path).is_file() for path in ('compatibility/rc/parent-base-class-tool-successor-inputs-v3.json', 'compatibility/rc/current-sass-tool-reference-inputs-v2.json')):
        source = _current_product_subject(root)
        selected = source.qualify(ref)
        return dict(ref) if selected is None else {**ref, 'sha256': selected['sha256'], **({'bytes': selected['bytes']} if 'bytes' in ref else {})}
    """Two exact physical source images for independent visibility comparisons.

    This metadata check does not replace the JS subject's complete transitive
    source/semantic receipt guard and does not return historical product bytes.
    """
    if ref['path'] not in SPINNER_SNACK_PATHS:
        return dict(ref)
    path = 'compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-inputs.json'
    raw = _read(root, path)
    assert digest(raw) == '52cb87f967965026ef0056a9d8c36a11a54f36b6d9efab1d235cb3e89c30d64f'
    packet = _decoded(raw)
    version = json.loads(_read(root, 'projects/ngx-material-legacy/package.json'))['version']
    line = '21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None
    assert line is not None
    data = packet['branches'][line]
    assert [r['path'] for r in data['modules']] == list(SPINNER_SNACK_PATHS)
    row = next(r for r in data['modules'] if r['path'] == ref['path'])
    _selected(ref, {'before': row['before'], 'after': row['current']})
    before = _original(str(root), data['before_commit'], ref['path'])
    _identity(before, row['before'])
    assert hashlib.sha1(('blob ' + str(len(before)) + '\0').encode() + before).hexdigest() == row['before']['blob']
    _identity(_read(root, ref['path']), row['current'])
    return {**ref, 'sha256': row['current']['sha256'],
            **({'bytes': row['current']['bytes']} if 'bytes' in ref else {})}


@functools.lru_cache(maxsize=8)
def _load_current_subject(root, module_name):
    import importlib.util
    path = Path(root) / 'scripts' / (module_name + '.py')
    spec = importlib.util.spec_from_file_location('_historical_' + module_name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@functools.lru_cache(maxsize=8)
def _current_tool_cached(root, manifest_sha):
    module = _load_current_subject(root, 'current_sass_tool_references')
    return module.CurrentSassToolReferences(root)


def _current_tool_subject(root):
    root = str(Path(root).absolute())
    manifest = _read(root, 'compatibility/rc/parent-base-class-tool-successor-inputs-v3.json')
    subject = _current_tool_cached(root, digest(manifest))
    subject.assert_current()
    return subject


@functools.lru_cache(maxsize=8)
def _current_product_cached(root):
    module = _load_current_subject(root, 'current_sass_source')
    return module.CurrentSassSource(root)


def _current_product_subject(root):
    subject = _current_product_cached(str(Path(root).absolute()))
    subject.assert_current()
    return subject
