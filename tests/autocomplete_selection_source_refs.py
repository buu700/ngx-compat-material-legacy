# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent reverse qualification of the exact spec and seven reader hooks."""
import hashlib
import json
import os
from pathlib import Path
import subprocess

SPEC = 'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts'
CODE = ('scripts/upstream-rules-js-build-admission.mjs', 'scripts/autocomplete-landscape-source-judgment.mjs',
        'scripts/upstream-testing-api-21x-admission.mjs', 'scripts/packed-product-source-recovery.mjs', 'scripts/packed-cva-source-requalification.mjs', 'scripts/dialog-portal-failure-recovery.mjs', 'scripts/snack-dom-source-context.mjs')
sha = lambda raw: hashlib.sha256(raw).hexdigest()


def _line(root):
    return '21.x' if json.loads((root / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'


def _git(root, parent, path):
    env = {**os.environ, 'GIT_NO_LAZY_FETCH': '1', 'GIT_NO_REPLACE_OBJECTS': '1'}
    for key in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
        env.pop(key, None)
    return subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
                                    'show', parent + ':' + path], cwd=root, env=env)


def spec_subject(root):
    raw = (root / 'compatibility/rc/autocomplete-selection-spec-successor.json').read_bytes()
    line = _line(root)
    assert sha(raw) == {'main': 'bf629b45cf65bc93a98a43a9f7fc2d0fb9cf720cc72c07d9c8545c60ee1e10a3',
                        '21.x': '7351ca1bb38ed03c8487db227d73194d94383941ca310a64604b0516188e33a5'}[line]
    packet = json.loads(raw)
    assert packet['line'] == line and packet['path'] == SPEC and len(packet['insertions']) == 5
    current = (root / SPEC).read_bytes()
    assert sha(current) == packet['after']['sha256'] and len(current) == packet['after']['bytes']
    reduced = current
    for edit in sorted(packet['insertions'], key=lambda row: row['byte_offset'], reverse=True):
        offset = edit['byte_offset'] + sum(len(row['text'].encode()) for row in packet['insertions'] if row['byte_offset'] < edit['byte_offset'])
        text = edit['text'].encode()
        assert reduced[offset:offset + len(text)] == text
        reduced = reduced[:offset] + reduced[offset + len(text):]
    assert reduced == _git(root, packet['source_parent'], SPEC)
    assert sha(reduced) == packet['before']['sha256'] == '09a96761ccbb96309989dfc13517170c3600fb2bd57b3fb7e9c9cb02f788d423'
    return packet


def qualified_reference(root, ref):
    """Return current metadata only after recovering the authenticated original."""
    if ref['path'] == 'scripts/upstream-historical-behavior-evidence.mjs':
        from autocomplete_selection_native_refs import qualified_native_reference
        return qualified_native_reference(root, ref)
    if ref['path'] == SPEC:
        packet = spec_subject(root)
        assert ref['sha256'] in (packet['before']['sha256'], packet['after']['sha256'])
        side = 'before' if ref['sha256'] == packet['before']['sha256'] else 'after'
        if 'bytes' in ref:
            assert ref['bytes'] == packet[side]['bytes']
        return dict(ref, **packet['after'])
    if ref['path'] not in CODE:
        return ref
    raw = (root / 'compatibility/rc/autocomplete-selection-source-reader-successors.json').read_bytes()
    line = _line(root)
    assert sha(raw) == {'main': 'bf806c5628500798e6045d40858b0523b6744656cf582ee1d263847d4f1cdcf3',
                        '21.x': '1dadb7cc8ebc65a9a89aff7bbfca28daf0a546e9757957d8af3deae0792dfaeb'}[line]
    packet = json.loads(raw)
    assert packet['line'] == line and tuple(row['path'] for row in packet['code_subjects']) == CODE
    row = next(row for row in packet['code_subjects'] if row['path'] == ref['path'])
    current = (root / ref['path']).read_bytes()
    assert sha(current) == row['after']['sha256'] and len(current) == row['after']['bytes']
    reduced = current.decode()
    for edit in reversed(row['literal_edits']):
        assert reduced.count(edit['after']) == 1
        reduced = reduced.replace(edit['after'], edit['before'])
    assert reduced.encode() == _git(root, packet['source_parent'], ref['path'])
    assert sha(reduced.encode()) == row['before']['sha256']
    assert ref['sha256'] in (row['before']['sha256'], row['after']['sha256'])
    side = 'before' if ref['sha256'] == row['before']['sha256'] else 'after'
    if 'bytes' in ref:
        assert ref['bytes'] == row[side]['bytes']
    return dict(ref, **row['after'])


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    packet = json.loads((root / 'compatibility/rc/autocomplete-selection-source-reader-successors.json').read_bytes())
    assert tuple(row['path'] for row in packet['code_subjects']) == CODE
    for row in packet['code_subjects']:
        assert qualified_reference(root, dict(path=row['path'], **row['before'])) == dict(path=row['path'], **row['after'])
    print(json.dumps(dict(line=_line(root), independently_reversed_code_hooks=len(CODE),
                          authenticated_git_originals_recovered=True, native_or_G11_qualified=False)))
