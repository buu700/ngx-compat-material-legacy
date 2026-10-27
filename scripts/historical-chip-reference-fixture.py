# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Stage unchanged original-source probes at their exact historical Git subject."""
import gzip
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import posixpath
import re
import subprocess
import sys
import tarfile

REFERENCES = {'main': '7625616ad4332ea30368f94061c07615273f2573',
              '21.x': '1604ca17ee11ebdfb1d8cdc8fe048b8177849e06'}
PROBES = ('tests/spec_surface_async_source_probe.mjs', 'tests/spec_form_async_source_probe.mjs',
          'tests/spec_navigation_async_source_probe.mjs')


def stage(root, line, output):
    root, output = Path(root).resolve(), Path(output).resolve()
    assert line in REFERENCES
    version = json.loads((root / 'projects/ngx-material-legacy/package.json').read_bytes())['version']
    assert ('21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None) == line
    assert output.is_dir() and not list(output.iterdir()), 'reference destination must be a fresh empty directory'
    env = {**os.environ, 'GIT_NO_LAZY_FETCH': '1', 'GIT_NO_REPLACE_OBJECTS': '1'}
    for key in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
        env.pop(key, None)

    def git(*args):
        return subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', *args], cwd=root, env=env)

    reference = REFERENCES[line]
    listing = git('ls-tree', '-rlz', reference)
    index = {}
    for record in listing.split(b'\0'):
        if not record:
            continue
        fields, path = record.split(b'\t')
        mode, kind, oid, size = fields.split()
        index[path.decode()] = dict(mode=mode.decode(), kind=kind.decode(), git_blob=oid.decode(), bytes=int(size))

    def source(path):
        return git('show', reference + ':' + path)

    # Follow the original local module graph. Original data capsules remain
    # unchanged; their producer and checkpoint references are staged as bytes.
    seen, queue, inputs = set(), list(PROBES), set()
    while queue:
        path = queue.pop()
        if path in seen:
            continue
        seen.add(path)
        text = source(path).decode()
        for _, name in re.findall(r"\bfrom\s*(['\"])([^'\"]+)\1", text):
            if name.startswith('.'):
                dep = posixpath.normpath(posixpath.join(posixpath.dirname(path), name))
                assert dep in index, 'missing historical local module ' + dep
                if dep.endswith(('.mjs', '.js')):
                    queue.append(dep)
        for _, name in re.findall(r"(['\"])((?:compatibility|scripts|tests|testing|projects)/[^'\"\n]+)\1", text):
            if name in index:
                inputs.add(name)
    selected = {path for path in index if path.startswith(('projects/ngx-material-legacy/', 'scripts/', 'testing/'))}
    selected.update(seen | inputs | {'package.json'})
    for path in inputs:
        if not path.endswith(('.json', '.json.gz')):
            continue
        raw = source(path)
        body = json.loads(gzip.decompress(raw) if path.endswith('.gz') else raw)
        if not isinstance(body, dict):
            continue
        refs = list(body.get('output_metadata', []))
        if isinstance(body.get('producer'), dict):
            refs.append(body['producer'])
        for ref in refs:
            if isinstance(ref, dict) and ref.get('path') in index:
                selected.add(ref['path'])
    for path in selected:
        parts = PurePosixPath(path).parts
        assert parts and not PurePosixPath(path).is_absolute() and '..' not in parts
        assert index[path]['kind'] == 'blob' and index[path]['mode'] in ('100644', '100755')
    archive = output / '.reference.tar'
    with archive.open('wb') as stream:
        subprocess.run(['git', '--literal-pathspecs', '--no-replace-objects', '-c', 'gc.auto=0', 'archive',
                        '--format=tar', reference, '--', *sorted(selected)], cwd=root, env=env, stdout=stream, check=True)
    with tarfile.open(archive) as tar:
        files = []
        for member in tar.getmembers():
            parts = PurePosixPath(member.name).parts
            assert parts and not PurePosixPath(member.name).is_absolute() and '..' not in parts
            assert member.isdir() or member.isfile(), 'nonregular historical archive member'
            if member.isfile():
                files.append(member.name)
        assert len(files) == len(set(files)) and set(files) == selected
        tar.extractall(output, filter='data')
    archive.unlink()
    members = []
    for path in sorted(selected):
        file = output / path
        assert file.is_file() and not file.is_symlink()
        raw = file.read_bytes()
        assert len(raw) == index[path]['bytes']
        assert hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest() == index[path]['git_blob']
        members.append(dict(path=path, git_blob=index[path]['git_blob'], bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest()))
    common = git('rev-parse', '--path-format=absolute', '--git-common-dir').decode().strip()
    (output / '.git').write_text('gitdir: ' + common + '\n')
    (output / 'node_modules').symlink_to(root / 'node_modules', target_is_directory=True)
    manifest = dict(schema_version=1, line=line, reference_commit=reference,
                    reference_tree=git('rev-parse', reference + '^{tree}').decode().strip(),
                    role='Unchanged historical source-only probe subject; never a current product or runtime qualification.',
                    local_module_closure=sorted(seen), members=members,
                    members_sha256=hashlib.sha256(json.dumps(members, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest(),
                    current_source_or_original_Git_objects_written=False, native_artifact_or_floor_qualified=False)
    (output / 'historical-reference-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return dict(line=line, reference_commit=reference, files=len(members), bytes=sum(row['bytes'] for row in members),
                local_modules=len(seen), current_product_qualified=False)


if __name__ == '__main__':
    assert len(sys.argv) == 4, 'expected root, line and fresh reference directory'
    print(json.dumps(stage(*sys.argv[1:])))
