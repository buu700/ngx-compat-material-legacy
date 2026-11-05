# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Build exact V3 source successors from authenticated Git DATA and literal edits.

Default is read-only. --write changes only the NEW V3 packet and its two maintained
factory SHA literals in each root. V1/V2 packets and builders are immutable.
The explicit source roster is bounded to the base-class composition and current
reference dispatch/tests. New leaf/stage/owner inputs are physical support only.
"""
import argparse
import difflib
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

ROOTS = {'21.x': Path('/home/parallels/.codex/worktrees/codex-closeout-21/ngx-compat-material-legacy'),
         'main': Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')}
CHECKPOINTS = {'21.x': 'd8ab97315b6c77b83f42c2bebcf63b2984fff255',
               'main': '59ba0e2aa8b76f71b472ea2831273e44e44b5b57'}
V1 = dict(path='compatibility/rc/current-sass-tool-reference-inputs-v1.json', sha256='ffb8fb98babb084a86e4d49f13ef17069f784eb732365c566f6c764efd62e64f', bytes=478008)
V2 = dict(path='compatibility/rc/current-sass-tool-reference-inputs-v2.json', sha256='d25ef6684992ececd518f7932bc68f5d43d433df23868d7a376ebf0a9e56a770', bytes=625566)
OUTPUT = 'compatibility/rc/parent-base-class-tool-successor-inputs-v3.json'
SELF = 'compatibility/rc/parent-base-class-tool-successor-builder-v1.py'
FACTORIES = ('scripts/current-sass-tool-references.mjs', 'scripts/current_sass_tool_references.py')
SHARED_UPDATES = ('scripts/historical-contract-repair-readers.mjs', 'tests/current_sass_tool_reference_probe.mjs', 'tests/test_current_sass_tool_references.py')
TEST_COMPATIBILITY_UPDATES = (
    'tests/current_sass_canonical_test_scope.mjs',
    'tests/current_sass_canonical_test_scope.py',
    'tests/legacy_removal_admission_probe.mjs',
    'tests/test_button_token_repairs_admission.py',
    'tests/test_button_tokenization_admission.py',
    'tests/test_control_m3_theme_admission.py',
    'tests/test_core_tokenization_admission.py',
    'tests/test_foundation_m3_theme_admission.py',
    'tests/test_inspection_compatibility_admission.py',
    'tests/test_legacy_removal_admission.py',
    'tests/test_legacy_removal_source.py',
    'tests/test_remaining_unthemable_admission.py',
    'tests/test_selector_density_admission.py',
    'tests/test_slider_m3_repairs_admission.py',
    'tests/test_surface_m3_theme_admission.py',
    'tests/test_theming_inspection_admission.py',
    'tests/m3_theme_boundary_admission_probe.mjs',
    'tests/test_m3_theme_boundary_admission.py',
)
UPDATES = {'21.x': (*SHARED_UPDATES, 'scripts/packed-upstream-ledger-epoch.mjs', 'scripts/table-local-compilation-owner-source.mjs', 'scripts/table-local-compilation-canonical-stage.mjs', 'scripts/legacy-removal-owner-source.mjs', 'scripts/upstream-legacy-removal-source.mjs', 'tests/historical_contract_repair_source.py', *TEST_COMPATIBILITY_UPDATES),
           'main': SHARED_UPDATES}
SUPPORT = {'21.x': ('scripts/base-class-removal-owner-source.mjs', 'scripts/base-class-removal-canonical-stage.mjs', 'compatibility/rc/21x-base-class-removal-admission-owner-inputs-v1.json', 'tests/current_sass_c04_tool_integration_probe.mjs', 'tests/m3_theme_boundary_historical_epoch_data.mjs', SELF),
           'main': ('tests/current_sass_c04_tool_integration_probe.mjs', SELF)}
TABLE_STAGE = dict(path='scripts/table-local-compilation-canonical-stage.mjs', sha256='bdb3137f6db42ed2611ac3a41e400478defed7f0076d203061d1e12d03f63b7c', bytes=8231)
LEGACY_SOURCE = dict(path='scripts/legacy-removal-owner-source.mjs', sha256='b88708bb7ed441e24c6ed623371330426d6a947df83452ca343487767d2c9122', bytes=6628)
TABLE_PACKET = dict(path='compatibility/rc/21x-table-local-compilation-admission-owner-inputs.json', sha256='1a35dd57edd9952a23d4bb2e8e9783f19583c00badfd7e9846fdbd2abc94f48b', bytes=184121)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def ref(path, raw):
    return dict(path=path, sha256=sha(raw), bytes=len(raw))


def physical(root, path):
    assert type(path) is str and path and '\\' not in path and '\0' not in path
    cursor = root
    assert cursor.is_dir() and not cursor.is_symlink()
    for part in path.split('/'):
        assert part not in ('', '.', '..')
        cursor /= part
        assert not cursor.is_symlink()
    assert cursor.is_file()
    return cursor.read_bytes()


def git_images(root, commit, paths):
    assert re.fullmatch('[0-9a-f]{40}', commit)
    assert len(set(paths)) == len(paths)
    for path in paths:
        assert path and '..' not in path and '\n' not in path and '\0' not in path and not path.startswith('/')
    env = dict(PATH=os.environ['PATH'], LANG='C', LC_ALL='C', GIT_CONFIG_GLOBAL='/dev/null', GIT_CONFIG_SYSTEM='/dev/null',
               GIT_TERMINAL_PROMPT='0', GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1')
    raw = subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'cat-file', '--batch'], cwd=root, env=env,
                                  input=('\n'.join(commit + ':' + path for path in paths) + '\n').encode())
    out, cursor = {}, 0
    for path in paths:
        end = raw.index(b'\n', cursor)
        blob, kind, length = raw[cursor:end].decode().split(' ')
        assert kind == 'blob'
        size = int(length)
        assert size >= 0
        body = raw[end + 1:end + size + 1]
        assert len(body) == size and raw[end + size + 1] == 10
        assert hashlib.sha1(b'blob ' + str(size).encode() + b'\0' + body).hexdigest() == blob
        out[path] = body
        cursor = end + size + 2
    assert cursor == len(raw)
    return out


def recipe(before, after):
    a, b = before.decode().splitlines(keepends=True), after.decode().splitlines(keepends=True)
    offsets, edits = [0], []
    for line in a:
        offsets.append(offsets[-1] + len(line.encode()))
    for tag, i, j, k, l in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag != 'equal':
            edits.append(dict(offset=offsets[i], before=''.join(a[i:j]), after=''.join(b[k:l])))
    cursor, parts = 0, []
    for edit in edits:
        offset, old = edit['offset'], edit['before'].encode()
        assert offset >= cursor and before[offset:offset + len(old)] == old
        parts.extend([before[cursor:offset], edit['after'].encode()])
        cursor = offset + len(old)
    assert b''.join([*parts, before[cursor:]]) == after
    return edits


def build(roots):
    packet = dict(schema_version=3, role='finite-current-sass-tool-reference-successor', previous_epoch=V2,
                  product_paths=[], historical_programs_executed=False, historical_reports_rewritten=0,
                  artifact_or_audit_admission_granted=False, branches={})
    snapshots = []
    for line, root in roots.items():
        paths = sorted(UPDATES[line])
        originals = git_images(root, CHECKPOINTS[line], [V1['path'], V2['path'], *paths])
        for frozen in (V1, V2):
            raw = physical(root, frozen['path'])
            assert ref(frozen['path'], raw) == frozen
            assert raw == originals[frozen['path']]
            snapshots.append((root, frozen, raw))
        previous = json.loads(originals[V2['path']])['branches'][line]
        registry = json.loads(physical(root, previous['historical_registry']['path']))
        assert ref(previous['historical_registry']['path'], physical(root, previous['historical_registry']['path'])) == {k: previous['historical_registry'][k] for k in ('path', 'sha256', 'bytes')}
        identities = {row['path']: dict(path=row['path'], **row['after']) for row in registry['tool_transitions']}
        identities.update({row['path']: row['after'] for row in previous['updates']})
        if line == '21.x':
            table_raw = physical(root, TABLE_PACKET['path'])
            assert ref(TABLE_PACKET['path'], table_raw) == TABLE_PACKET
            assert json.loads(table_raw)['code_transitions'][0]['after'] == LEGACY_SOURCE
            snapshots.append((root, TABLE_PACKET, table_raw))
        updates = []
        for path in paths:
            before, after = originals[path], physical(root, path)
            predecessor = ref(path, before)
            exact_new = {TABLE_STAGE['path']: TABLE_STAGE, LEGACY_SOURCE['path']: LEGACY_SOURCE}
            assert predecessor == (exact_new[path] if path in exact_new else identities[path])
            updates.append(dict(path=path, before=predecessor, after=ref(path, after), edits=recipe(before, after)))
            snapshots.append((root, ref(path, after), after))
        additional = []
        for path in SUPPORT[line]:
            assert path not in FACTORIES and path != OUTPUT
            raw = physical(root, path)
            additional.append(ref(path, raw))
            snapshots.append((root, ref(path, raw), raw))
        packet['branches'][line] = dict(source_parent=CHECKPOINTS[line], updates=updates, additional_inputs=additional)
    for root, identity, raw in snapshots:
        assert physical(root, identity['path']) == raw
    return (json.dumps(packet, indent=2) + '\n').encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root-21', type=Path, default=ROOTS['21.x'])
    parser.add_argument('--root-main', type=Path, default=ROOTS['main'])
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    roots = {'21.x': args.root_21, 'main': args.root_main}
    body = build(roots)
    digest = sha(body)
    if args.write:
        for root in roots.values():
            (root / OUTPUT).write_bytes(body)
            for path in FACTORIES:
                text = (root / path).read_text()
                pattern = r"(INPUTS_SHA = ')[0-9a-f]{64}(')" if path.endswith('.py') else r"(const INPUTS_SHA=')[0-9a-f]{64}(';)"
                text, count = re.subn(pattern, lambda match: match[1] + digest + match[2], text)
                assert count == 1
                (root / path).write_text(text)
        assert build(roots) == body
    packet = json.loads(body)
    print(json.dumps(dict(path=OUTPUT, sha256=digest, bytes=len(body), written=args.write,
                          branches={line: dict(updates=len(branch['updates']), additional_inputs=len(branch['additional_inputs'])) for line, branch in packet['branches'].items()}), indent=2))


if __name__ == '__main__':
    main()
