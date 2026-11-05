# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Build one finite V2 tool image; authenticate Git data, never execute old tools.

Without --write print the proposed packet digest/counts only. --write writes only
V2 data and the exact INPUTS_SHA literals of the two maintained tool factories.
V1 is a fixed input and is never overwritten. Additional new source packets or
helpers must be named explicitly with --extra-input (present on both lines).
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
BASE = {'21.x': '53f9b14b0e182671c0fdd0a4c73ef97300193f0d', 'main': 'd9dcc3a8de8172301258bae37e5694447fb6a4c1'}
CHECKPOINT = {'21.x': 'b25aedd02f7b53e8cd8dfcdad369a806a1301619', 'main': '5e9f8e51fd53b63500ce9f292a3b0bd9e8b4e2d8'}
V1 = 'compatibility/rc/current-sass-tool-reference-inputs-v1.json'
V1_SHA = 'ffb8fb98babb084a86e4d49f13ef17069f784eb732365c566f6c764efd62e64f'
V2 = 'compatibility/rc/current-sass-tool-reference-inputs-v2.json'
FACTORIES = {'scripts/current-sass-tool-references.mjs', 'scripts/current_sass_tool_references.py'}
OWNED = {'scripts/historical-contract-repair-readers.mjs', 'tests/historical_contract_repair_source.py',
         'tests/test_current_sass_tool_references.py', 'tests/current_sass_tool_reference_probe.mjs'}
EXPLICIT_NEW_INPUTS = ['compatibility/rc/current-sass-source-inputs-v2.json']


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def ref(path, raw):
    return dict(path=path, sha256=sha(raw), bytes=len(raw))


def git(root, *args):
    env = dict(PATH=os.environ['PATH'], LANG='C', LC_ALL='C', GIT_CONFIG_GLOBAL='/dev/null',
               GIT_CONFIG_SYSTEM='/dev/null', GIT_TERMINAL_PROMPT='0', GIT_NO_REPLACE_OBJECTS='1', GIT_NO_LAZY_FETCH='1')
    return subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', *args], cwd=root, env=env)


def tool(path):
    return re.fullmatch(r'(?:scripts|tests)/[a-zA-Z0-9_.-]+\.(?:mjs|cjs|py)', path) is not None


def recipe(before, after):
    a, b = before.decode().splitlines(keepends=True), after.decode().splitlines(keepends=True)
    offsets, edits = [0], []
    for line in a:
        offsets.append(offsets[-1] + len(line.encode()))
    for tag, i, j, k, l in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag != 'equal':
            edits.append(dict(offset=offsets[i], before=''.join(a[i:j]), after=''.join(b[k:l])))
    cursor, result = 0, []
    for edit in edits:
        offset, old = edit['offset'], edit['before'].encode()
        assert before[offset:offset + len(old)] == old and offset >= cursor
        result.extend([before[cursor:offset], edit['after'].encode()])
        cursor = offset + len(old)
    assert b''.join([*result, before[cursor:]]) == after
    return edits


def build(roots, extra_inputs=()):
    prior_raw = (roots['21.x'] / V1).read_bytes()
    assert sha(prior_raw) == V1_SHA and len(prior_raw) == 478008
    previous = json.loads(prior_raw)
    packet = dict(schema_version=2, role=previous['role'], previous_epoch=ref(V1, prior_raw),
                  product_paths=[], historical_programs_executed=False, historical_reports_rewritten=0,
                  artifact_or_audit_admission_granted=False, branches={})
    for line, root in roots.items():
        assert (root / V1).read_bytes() == prior_raw == git(root, 'show', CHECKPOINT[line] + ':' + V1)
        old = previous['branches'][line]
        assert old['historical_registry']['source_parent'] == BASE[line]
        historical = json.loads(git(root, 'show', BASE[line] + ':' + old['historical_registry']['path']))
        assert len(historical['tool_transitions']) == (45 if line == '21.x' else 17)
        existing_base = set(git(root, 'ls-tree', '-r', '--name-only', BASE[line], '--', 'scripts', 'tests').decode().splitlines())
        checkpoint_paths = set(git(root, 'ls-tree', '-r', '--name-only', CHECKPOINT[line], '--', 'scripts', 'tests').decode().splitlines())
        changed = set(git(root, 'diff', '--name-only', BASE[line], '--', 'scripts', 'tests').decode().splitlines())
        paths = set(r['path'] for r in old['updates']) | OWNED
        paths.update(p for p in changed if p in existing_base and tool(p))
        paths.update(r['path'] for r in old['additional_inputs'] if tool(r['path']))
        paths.difference_update(FACTORIES)
        updates = []
        for path in sorted(paths):
            assert tool(path) and path in checkpoint_paths, 'new path requires explicit additional input, not a historical recipe: ' + path
            parent = BASE[line] if path in existing_base else CHECKPOINT[line]
            before, after = git(root, 'show', parent + ':' + path), (root / path).read_bytes()
            row = dict(path=path, before=ref(path, before), after=ref(path, after), edits=recipe(before, after))
            if parent != BASE[line]:
                row['source_parent'] = parent
            updates.append(row)
        by_path = {r['path']: r for r in updates}
        for row in old['updates']:
            assert by_path[row['path']]['before'] == row['before']
            assert ref(row['path'], git(root, 'show', CHECKPOINT[line] + ':' + row['path'])) == row['after']
        # Keep all prior data/guard paths and current images; add new paths explicitly.
        added = list(dict.fromkeys([r['path'] for r in old['additional_inputs']] + EXPLICIT_NEW_INPUTS + list(extra_inputs)))
        for path in added:
            assert tool(path) or (path.startswith('compatibility/rc/') and all(p not in ('', '.', '..') for p in path.split('/')))
            assert path not in FACTORIES
        packet['branches'][line] = dict(historical_registry=old['historical_registry'], previous_epoch_source_parent=CHECKPOINT[line],
                                         intermediate_inputs=old['intermediate_inputs'], updates=updates,
                                         additional_inputs=[ref(path, (root / path).read_bytes()) for path in added])
    return (json.dumps(packet, indent=2) + '\n').encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root-21', type=Path, default=ROOTS['21.x'])
    parser.add_argument('--root-main', type=Path, default=ROOTS['main'])
    parser.add_argument('--extra-input', action='append', default=[])
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    roots = {'21.x': args.root_21, 'main': args.root_main}
    body = build(roots, args.extra_input)
    digest, packet = sha(body), json.loads(body)
    if args.write:
        for root in roots.values():
            (root / V2).write_bytes(body)
            for path in sorted(FACTORIES):
                text = (root / path).read_text()
                pattern = r"(INPUTS_SHA = ')[0-9a-f]{64}(')"
                if path.endswith('.mjs'):
                    pattern = r"(const INPUTS_SHA=')[0-9a-f]{64}(';)"
                text, count = re.subn(pattern, lambda m: m[1] + digest + m[2], text)
                assert count == 1
                (root / path).write_text(text)
            assert sha((root / V1).read_bytes()) == V1_SHA
    print(json.dumps(dict(path=V2, sha256=digest, bytes=len(body), written=args.write,
                          counts={line:dict(updates=len(b['updates']), checkpoint_parent_updates=sum('source_parent' in r for r in b['updates']),
                                            v1_current_identities=len(json.loads((roots[line] / V1).read_bytes())['branches'][line]['updates']),
                                            additional_inputs=len(b['additional_inputs'])) for line, b in packet['branches'].items()}), indent=2))


if __name__ == '__main__':
    main()
