# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Extend the shared exact-Git staging algorithm for finite original probe subjects."""
import gzip
import hashlib
import importlib.util
import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import sys


CATALOG = 'compatibility/rc/historical-consumer-source-subjects.json'
PINS = {'main': '8a0d7419de3d3ed7e7d0825b5223174f05e34cff86d184bb0632dc16b8d16b36',
        '21.x': 'aadca3d619b2f8bd017ee0ee3e90b894de826df57ebaad342501083aa200118e'}
BASE = 'scripts/historical-chip-reference-fixture.py'
BASE_SHA = 'dc675455781e6b4119f9230412250499974e6f016dd720dfdd40c4ddea9329d3'
GRAPH = 'scripts/historical-consumer-module-graph.mjs'
GRAPH_SHA = '72eac7900d6ee5241d991060fe43d023032b023b6c1622a08c6ecd3299060a2e'


def stage(root, line, family, output):
    root, output = Path(root).resolve(), Path(output).resolve()
    raw = (root / CATALOG).read_bytes()
    assert line in PINS and hashlib.sha256(raw).hexdigest() == PINS[line], 'unregistered historical catalog'
    catalog = json.loads(raw)
    assert catalog['line'] == line and len(catalog['entries']) == 23
    choices = [row for row in catalog['entries'] if row['id'] == family]
    assert len(choices) == 1, 'unknown historical consumer family'
    subject = choices[0]
    assert hashlib.sha256((root / BASE).read_bytes()).hexdigest() == BASE_SHA, 'shared staging algorithm changed'
    spec = importlib.util.spec_from_file_location('historical_chip_reference_fixture', root / BASE)
    base = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(base)
    # Reuse the unchanged shared extraction and Git/blob checks. Module discovery
    # belongs to the parsed extension below, so quoted source fixtures never
    # become phantom imports in the shared implementation's older regex scan.
    base.REFERENCES = {line: subject['reference_commit']}
    base.PROBES = ()
    base.stage(root, line, output)
    manifest_path = output / 'historical-reference-manifest.json'
    base_raw = manifest_path.read_bytes()
    manifest = json.loads(base_raw)
    assert manifest['reference_tree'] == subject['reference_tree']

    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY',
                'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
        env.pop(key, None)

    def git(*args):
        return subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0',
                                        '-c', 'maintenance.auto=0', *args], cwd=root, env=env)

    index = {}
    for record in git('ls-tree', '-rlz', subject['reference_commit']).split(b'\0'):
        if record:
            fields, path = record.split(b'\t')
            mode, kind, oid, size = fields.split()
            index[path.decode()] = dict(mode=mode.decode(), kind=kind.decode(), oid=oid.decode(), bytes=int(size))
    selected = {row['path'] for row in manifest['members']}
    additions = set()

    def select(path):
        if path not in index or path in selected or path in additions:
            return
        parts = PurePosixPath(path).parts
        assert parts and not PurePosixPath(path).is_absolute()
        assert all(part not in ('', '.', '..', '.git', 'node_modules') for part in parts)
        assert index[path]['kind'] == 'blob' and index[path]['mode'] in ('100644', '100755')
        additions.add(path)

    # Root tooling is data here. Recursive packet references retain their exact
    # historical owned context, producer, checkpoint and wrapper bytes.
    for path in ('package.json', 'pnpm-lock.yaml', 'toolchain-lock.json', '.node-version', '.npm-version',
                 'tsconfig.json', 'justfile', 'pnpm-workspace.yaml'):
        select(path)
    assert hashlib.sha256((root / GRAPH).read_bytes()).hexdigest() == GRAPH_SHA, 'historical module parser changed'
    graph = json.loads(subprocess.check_output(['node', str(root / GRAPH)], cwd=root, env=env,
        input=json.dumps(dict(reference=subject['reference_commit'], probe=subject['probe'], paths=sorted(index))).encode()))
    manifest['local_module_closure'] = graph['modules']
    for path in graph['modules'] + graph['inputs']:
        select(path)

    def references(value):
        if isinstance(value, dict):
            if isinstance(value.get('path'), str):
                select(value['path'])
            for child in value.values():
                references(child)
        elif isinstance(value, list):
            for child in value:
                references(child)

    visited = set()
    while True:
        pending = sorted(path for path in selected | additions
                         if path.startswith('compatibility/') and path.endswith(('.json', '.json.gz')) and path not in visited
                         and path != 'compatibility/f10/disposition-ledger/ledger.json')
        if not pending:
            break
        for path in pending:
            visited.add(path)
            data = (output / path).read_bytes() if path in selected else git('show', subject['reference_commit'] + ':' + path)
            references(json.loads(gzip.decompress(data) if path.endswith('.gz') else data))
    for path in sorted(additions):
        data = git('show', subject['reference_commit'] + ':' + path)
        entry = index[path]
        assert len(data) == entry['bytes']
        assert hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() == entry['oid']
        target = output / path
        assert not target.exists() and not target.is_symlink()
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        manifest['members'].append(dict(path=path, git_blob=entry['oid'], bytes=len(data), sha256=hashlib.sha256(data).hexdigest()))
    manifest['members'].sort(key=lambda row: row['path'])
    probe = next(row for row in manifest['members'] if row['path'] == subject['probe'])
    assert probe['sha256'] == subject['probe_sha256']
    manifest['members_sha256'] = hashlib.sha256(json.dumps(manifest['members'], separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
    manifest['consumer_extension'] = dict(family=family, catalog_sha256=PINS[line],
        shared_stager=dict(path=BASE, sha256=BASE_SHA), base_manifest_sha256=hashlib.sha256(base_raw).hexdigest(),
        module_graph_parser=dict(path=GRAPH, sha256=GRAPH_SHA, runtime=graph['parser']),
        extra_exact_Git_members=len(additions), original_probe_source_unchanged=True)
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    return dict(line=line, family=family, reference_commit=subject['reference_commit'],
                selected_members=len(manifest['members']), selected_bytes=sum(row['bytes'] for row in manifest['members']),
                current_source_qualified=False)


if __name__ == '__main__':
    assert len(sys.argv) == 5, 'expected root, line, registered family and fresh reference directory'
    print(json.dumps(stage(*sys.argv[1:])))
