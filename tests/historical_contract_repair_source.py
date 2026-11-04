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
READER_PINS = {'21.x': '577d690ecdad79da270dda15a73649c519e5f9444f9e0a0739d94aecefa45a90',
               'main': '702d6f65109297515ee1fc57810eaf8fe0a9f7148742ff8572d90824d57b2944'}


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
    assert len(data['tool_transitions']) == (17 if data['line'] == '21.x' else 7)
    assert len({row['path'] for row in data['tool_transitions']}) == len(data['tool_transitions'])
    ref = data['unchanged_source_subject']
    _identity(_read(root, ref['path']), ref)
    if data['line'] == '21.x':
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
    return data


def _tool_intermediate(root, data, row):
    if data['line'] != '21.x' or row['path'] != 'scripts/packed-upstream-ledger-epoch.mjs':
        return None
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
    assert re.fullmatch(r'(?:scripts/[^/]+\.(?:mjs|cjs)|tests/[^/]+\.(?:py|mjs))', row['path'])
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
