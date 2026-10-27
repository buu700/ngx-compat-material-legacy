# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independently reverse seven Sass prefixes and six finite reader changes."""
import hashlib
import json
import os
import subprocess

SHA = lambda raw: hashlib.sha256(raw).hexdigest()
PARENT = '8dccb816e63c1f417ac6f1d5b502b8ea43aae2d0'
HEADER = b'// Copyright Google LLC All Rights Reserved.\n// Copyright (c) 2026 Ryan Lester.\n// Use of this source code is governed by the MIT license in LICENSE.\n\n'
NAMES = ('bottom-sheet', 'button-toggle', 'divider', 'expansion', 'sidenav', 'sort', 'tree')
CODE = ('scripts/autocomplete-selection-spec-subject.mjs', 'scripts/packed-product-source-recovery.mjs',
        'scripts/dialog-portal-failure-recovery.mjs', 'scripts/snack-dom-source-context.mjs',
        'scripts/upstream-sass-inspection-admission.mjs', 'scripts/upstream-rules-js-build-admission.mjs')


def _rows(root):
    version = json.loads((root / 'projects/ngx-material-legacy/package.json').read_bytes())['version']
    if version.startswith('21.'):
        return []
    assert version.startswith('22.')
    files = (('compatibility/rc/sass-wrapper-notice-successor.json', '5be99f3d9441057f9007868ffc7f1c9efe7d7b766b56fa0e640ba80e4cff7493'),
             ('compatibility/rc/sass-wrapper-notice-reader-successors.json', '9ca055d63bd19e5ef82d3c0894683190522aadb60d3bc959ef0565f788395919'))
    packets = []
    for path, digest in files:
        raw = (root / path).read_bytes()
        assert SHA(raw) == digest
        packet = json.loads(raw)
        assert packet['schema_version'] == 1 and packet['line'] == 'main' and packet['source_parent'] == PARENT
        packets.append(packet)
    notices, readers = packets
    assert notices['header'].encode() == HEADER and notices['comment_prefix_additions'] == 7
    assert notices['source_code_HTML_selectors_maps_mixin_calls_or_goldens_changed'] == 0
    assert not notices['current_artifact_or_C05_freeze_qualified'] and notices['g13_claim'] == 'not-passed'
    assert tuple(row['path'] for row in notices['subjects']) == tuple('projects/ngx-material-legacy/styles/' + n + '/_' + n + '-theme.scss' for n in NAMES)
    assert tuple(row['path'] for row in readers['code_subjects']) == CODE
    assert readers['unrelated_code_changes'] == readers['original_receipts_or_goldens_rewritten'] == 0
    assert not readers['actual_native_packed_or_floor_executed'] and readers['g13_claim'] == 'not-passed'
    return notices['subjects'] + readers['code_subjects']


def notice_prior_bytes(root, path):
    """Return an authenticated historical input solely for reverse proof checking."""
    row = next((row for row in _rows(root) if row['path'] == path), None)
    current = (root / path).read_bytes()
    if row is None:
        return current
    assert SHA(current) == row['after']['sha256'] and len(current) == row['after']['bytes']
    if 'literal_edits' in row:
        text = current.decode()
        for edit in reversed(row['literal_edits']):
            assert text.count(edit['after']) == 1
            text = text.replace(edit['after'], edit['before'])
        reduced = text.encode()
    else:
        assert current.startswith(HEADER) and row['executable_source_bytes_changed'] == 0 and row['line21_notice_matches']
        reduced = current[len(HEADER):]
        assert HEADER not in reduced
    assert SHA(reduced) == row['before']['sha256'] and len(reduced) == row['before']['bytes']
    env = {**os.environ, 'GIT_NO_LAZY_FETCH': '1', 'GIT_NO_REPLACE_OBJECTS': '1'}
    for key in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
        env.pop(key, None)
    assert reduced == subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
                                                'show', PARENT + ':' + path], cwd=root, env=env)
    return reduced


def qualified_notice_reference(root, ref):
    row = next((row for row in _rows(root) if row['path'] == ref['path']), None)
    if row is None:
        return None
    notice_prior_bytes(root, ref['path'])
    assert ref['sha256'] in (row['before']['sha256'], row['after']['sha256'])
    side = 'before' if ref['sha256'] == row['before']['sha256'] else 'after'
    if 'bytes' in ref:
        assert ref['bytes'] == row[side]['bytes']
    return dict(ref, **row['after'])


if __name__ == '__main__':
    from pathlib import Path
    root = Path(__file__).resolve().parents[1]
    rows = _rows(root)
    for row in rows:
        assert qualified_notice_reference(root, dict(path=row['path'], **row['before'])) == dict(path=row['path'], **row['after'])
    print(json.dumps(dict(independently_reversed_silent_prefixes=7, independently_reversed_reader_hooks=len(CODE),
                          authenticated_originals=len(rows), native_or_G13_qualified=False)))
