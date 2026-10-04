#!/usr/bin/env python3
"""Index a verifier run and recheck it after the directory has moved.

Paths are relative to the directory on the command line. verify-summary.json
records the machine that produced the run in "out"; this tool never opens that
path. A failed run may still have a complete index. The index is not durable
storage beyond the CI artifact lifetime.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

INDEX_NAME = 'closure-index.json'
REQUIRED = (
    'run.json',
    'verify-summary.json',
    'pack-execution.json',
    'pack-meta.json',
    'execution-record.json',
)
REFUSED = {'node_modules', '.cache', '.git'}


class ClosureError(Exception):
    pass


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _load_json(path: Path):
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as error:
        raise ClosureError(f'cannot read {path.name}: {error}') from error


def _relative_files(root: Path) -> list[dict]:
    files = []
    for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
        current = Path(dirpath)
        kept = []
        for name in sorted(dirnames):
            child = current / name
            if child.is_symlink():
                raise ClosureError(f'refusing symlink directory {child.relative_to(root).as_posix()}')
            if name in REFUSED:
                raise ClosureError(f'refusing to archive {child.relative_to(root).as_posix()}')
            kept.append(name)
        dirnames[:] = kept
        for name in sorted(filenames):
            path = current / name
            relative = path.relative_to(root).as_posix()
            if path.is_symlink():
                raise ClosureError(f'refusing symlink {relative}')
            if relative == INDEX_NAME:
                continue
            data = path.read_bytes()
            files.append({'path': relative, 'sha256': _sha256(data), 'bytes': len(data)})
    return files


def _identity_paths(root: Path) -> list[tuple[str, str | None, int | None]]:
    """Run-relative paths a present manifest says must exist, with optional recorded hashes."""
    required: list[tuple[str, str | None, int | None]] = [(name, None, None) for name in REQUIRED]
    run_path = root / 'run.json'
    if run_path.is_file():
        run = _load_json(run_path)
        for key in ('execution_record', 'pack_execution', 'pack_metadata'):
            record = run.get(key)
            if isinstance(record, dict) and isinstance(record.get('path'), str):
                required.append((record['path'], record.get('sha256'), record.get('bytes')))
        for artifact in run.get('artifacts') or []:
            if isinstance(artifact, dict) and isinstance(artifact.get('path'), str):
                required.append((artifact['path'], artifact.get('sha256'), artifact.get('bytes')))
    meta_path = root / 'pack-meta.json'
    if meta_path.is_file():
        meta = _load_json(meta_path)
        if isinstance(meta.get('tarball'), str):
            required.append((meta['tarball'], None, None))
    summary_path = root / 'verify-summary.json'
    if summary_path.is_file():
        summary = _load_json(summary_path)
        completeness = summary.get('completeness') if isinstance(summary, dict) else None
        for record in (completeness or {}).get('validated_files') or []:
            if isinstance(record, dict) and record.get('root') == 'run' and isinstance(record.get('path'), str):
                required.append((record['path'], record.get('sha256'), record.get('bytes')))
    reports = root / 'reports'
    if reports.is_dir():
        for path in sorted(reports.glob('*.json')):
            if path.is_symlink():
                raise ClosureError(f'refusing symlink {path.relative_to(root).as_posix()}')
            report = _load_json(path)
            for output in report.get('outputs') or []:
                if isinstance(output, dict) and isinstance(output.get('path'), str):
                    required.append((output['path'], output.get('sha256'), output.get('bytes')))
    return required


def _check_identity(root: Path, relative: str, sha256: str | None, size: int | None) -> None:
    path = root / relative
    if relative.startswith('/') or '..' in Path(relative).parts:
        raise ClosureError(f'refusing path outside the run: {relative}')
    if not path.is_file() or path.is_symlink():
        raise ClosureError(f'missing closure file {relative}')
    data = path.read_bytes()
    if isinstance(sha256, str) and _sha256(data) != sha256:
        raise ClosureError(f'hash mismatch {relative}: recorded bytes were not reused from another run')
    if isinstance(size, int) and size != len(data):
        raise ClosureError(f'byte mismatch {relative}')


def write_closure(root: Path) -> dict:
    root = root.resolve()
    if not root.is_dir():
        raise ClosureError(f'missing run directory {root}')
    for relative, sha256, size in _identity_paths(root):
        _check_identity(root, relative, sha256, size)
    run = _load_json(root / 'run.json')
    summary = _load_json(root / 'verify-summary.json')
    matrix = run.get('expected_matrix') if isinstance(run.get('expected_matrix'), dict) else {}
    index = {
        'schema_version': 1,
        'role': 'run closure index',
        'run_id': run.get('run_id'),
        'summary_run_id': summary.get('run_id'),
        'origin_ignored': True,
        'matrix': {'path': matrix.get('path'), 'sha256': matrix.get('sha256')},
        'files': _relative_files(root),
        'limitations': [
            'Does not open verify-summary out. Rehydration uses the directory it is given.',
            'A complete index of a failed run is still a failed run.',
            'GitHub artifact retention is not durable engineering-admission storage.',
        ],
    }
    if index['run_id'] != index['summary_run_id']:
        raise ClosureError('verify-summary run_id does not match run.json')
    target = root / INDEX_NAME
    target.write_text(json.dumps(index, indent=2) + '\n')
    return index


def check_closure(root: Path, source: Path | None = None) -> dict:
    root = root.resolve()
    index_path = root / INDEX_NAME
    if not index_path.is_file() or index_path.is_symlink():
        raise ClosureError(f'missing {INDEX_NAME}')
    index = _load_json(index_path)
    if index.get('schema_version') != 1 or index.get('origin_ignored') is not True:
        raise ClosureError('closure index is not a movable run index')
    listed = {}
    for record in index.get('files') or []:
        if not isinstance(record, dict) or not isinstance(record.get('path'), str):
            raise ClosureError('closure index has an invalid file record')
        relative = record['path']
        if relative in listed:
            raise ClosureError(f'duplicate closure path {relative}')
        _check_identity(root, relative, record.get('sha256'), record.get('bytes'))
        listed[relative] = record
    for name in REQUIRED:
        if name not in listed:
            raise ClosureError(f'missing closure file {name}')
    present = {item['path'] for item in _relative_files(root)}
    extra = sorted(present - set(listed))
    missing = sorted(set(listed) - present)
    if extra or missing:
        raise ClosureError(f'closure files diverged extra={extra[:8]} missing={missing[:8]}')
    for relative, sha256, size in _identity_paths(root):
        _check_identity(root, relative, sha256, size)
    summary = _load_json(root / 'verify-summary.json')
    if 'out' not in summary:
        raise ClosureError('verify-summary has no origin field to ignore')
    matrix = index.get('matrix') or {}
    if source is not None and isinstance(matrix.get('path'), str) and isinstance(matrix.get('sha256'), str):
        candidate = source / matrix['path']
        if not candidate.is_file() or candidate.is_symlink():
            raise ClosureError(f'matching source is missing {matrix["path"]}')
        data = candidate.read_bytes()
        if _sha256(data) != matrix['sha256']:
            raise ClosureError(f'matrix hash does not match this source checkout: {matrix["path"]}')
    return index


def main(argv: list[str]) -> int:
    if len(argv) not in (2, 4) or argv[0] not in ('--write', '--check'):
        print('usage: archive_run_closure.py --write <run-dir> | --check <run-dir> [--source <checkout>]', file=sys.stderr)
        return 2
    root = Path(argv[1])
    source = None
    if len(argv) == 4:
        if argv[0] != '--check' or argv[2] != '--source':
            print('usage: archive_run_closure.py --check <run-dir> --source <checkout>', file=sys.stderr)
            return 2
        source = Path(argv[3])
    try:
        index = write_closure(root) if argv[0] == '--write' else check_closure(root, source)
    except ClosureError as error:
        print(f'closure: {error}', file=sys.stderr)
        return 2
    print(f"closure: {index['run_id']} files={len(index['files'])}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
