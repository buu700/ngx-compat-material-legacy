# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independently reverse only the authenticated title TOOL transition; never execute it."""
import hashlib
import json
import os
import subprocess

SHA = lambda raw: hashlib.sha256(raw).hexdigest()
PACKET = 'compatibility/rc/dialog-title-current-source-reader-successors.json'
PINS = {'main': '8ec37f431f8da2aee653a62fb4676cd86e67f3fea233b530cf440e15cbf44d71', '21.x': 'c189a19263d4862df74b47f590c1cb21875932406e150b9dc35141c448a86369'}


def _row(root, path):
    line = '21.x' if json.loads((root / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
    raw = (root / PACKET).read_bytes()
    assert SHA(raw) == PINS[line]
    packet = json.loads(raw)
    assert packet['schema_version'] == 1 and packet['line'] == line
    assert len(packet['code_subjects']) == 9
    assert not packet['old_product_bytes_exposed'] and packet['canonical_decisions_changed'] == 0
    assert not packet['native_or_full_qualification']
    assert all(row['path'].startswith('scripts/') and row['path'].endswith('.mjs') for row in packet['code_subjects'])
    return packet, next((row for row in packet['code_subjects'] if row['path'] == path), None)


def title_prior_tool_bytes(root, path):
    """Private metadata before-image; product requests always retain current bytes."""
    packet, row = _row(root, path)
    current = (root / path).read_bytes()
    if row is None:
        return current
    assert SHA(current) == row['after']['sha256'] and len(current) == row['after']['bytes']
    reduced = current.decode()
    for edit in reversed(row['literal_edits']):
        assert reduced.count(edit['after']) == 1
        reduced = reduced.replace(edit['after'], edit['before'])
    prior = reduced.encode()
    assert SHA(prior) == row['before']['sha256'] and len(prior) == row['before']['bytes']
    env = {**os.environ, 'GIT_NO_LAZY_FETCH': '1', 'GIT_NO_REPLACE_OBJECTS': '1'}
    for key in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
        env.pop(key, None)
    assert prior == subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
                                            'show', packet['source_parent'] + ':' + path], cwd=root, env=env)
    return prior


def qualified_title_reader_reference(root, ref):
    _, row = _row(root, ref['path'])
    if row is None:
        return None
    title_prior_tool_bytes(root, ref['path'])
    assert ref['sha256'] in (row['before']['sha256'], row['after']['sha256'])
    side = 'before' if ref['sha256'] == row['before']['sha256'] else 'after'
    if 'bytes' in ref:
        assert ref['bytes'] == row[side]['bytes']
    return dict(ref, **row['after'])
