#!/usr/bin/env python3
"""Static precheck of an npm tarball/directory; not an Angular compiler or security audit."""
from __future__ import annotations
import argparse
import fnmatch
import json
import re
import sys
import tarfile
from pathlib import Path, PurePosixPath
from typing import Any

PACKAGE = '@ngx-compat/material-legacy'
ENGINE_RE = re.compile(r'@angular/(?:animations(?:/[\w.-]+)*|platform-browser/animations(?:/[\w.-]+)*)')
OLD_LEGACY_RE = re.compile(r'@angular/material/legacy-[\w/-]+')
MAX_FILE_BYTES = 32 * 1024 * 1024
MAX_TOTAL_BYTES = 128 * 1024 * 1024


# Matches real dependency edges only (import/export/require), not comments/docs.
_MODULE_EDGE = re.compile(
    r"""(?:
          (?:^|[;{}\n])\s*import\s*(?:type\s+)?(?:[\w*{}$,\s]+\s+from\s*)?\s*['"]([^'"]+)['"]
        | (?:^|[;{}\n])\s*export\s*(?:type\s+)?(?:\{[^}]*\}\s*from\s*|\*\s*(?:as\s+\w+\s+)?from\s*)\s*['"]([^'"]+)['"]
        | \bimport\s*\(\s*['"]([^'"]+)['"]
        | \brequire\s*\(\s*['"]([^'"]+)['"]
        )""",
    re.MULTILINE | re.VERBOSE,
)


def module_edges(text: str) -> list[str]:
    out = []
    for m in _MODULE_EDGE.finditer(text):
        out.append(next(g for g in m.groups() if g is not None))
    return out


def is_engine_module(module: str) -> bool:
    return bool(ENGINE_RE.fullmatch(module) or ENGINE_RE.match(module + '/'))




def read_package(path: Path) -> dict[str, bytes]:
    """Read without extracting; reject links, traversal, duplicates and excessive payloads."""
    files: dict[str, bytes] = {}
    total = 0
    if path.is_dir():
        base = path.resolve()
        if (base / 'package' / 'package.json').is_file():
            base = base / 'package'
        for item in sorted(base.rglob('*')):
            if item.is_symlink():
                raise ValueError(f'Package symlink not accepted: {item}')
            if not item.is_file():
                continue
            size = item.stat().st_size
            if size > MAX_FILE_BYTES or total + size > MAX_TOTAL_BYTES:
                raise ValueError('Package exceeds static-inspection size limits.')
            total += size
            files[item.relative_to(base).as_posix()] = item.read_bytes()
        return files
    with tarfile.open(path, mode='r:*') as archive:
        for member in archive:
            pure = PurePosixPath(member.name)
            if pure.is_absolute() or '..' in pure.parts:
                raise ValueError(f'Unsafe archive path: {member.name}')
            if member.issym() or member.islnk():
                raise ValueError(f'Archive links not accepted: {member.name}')
            if member.isdir():
                continue
            if not member.isfile() or not pure.parts or pure.parts[0] != 'package':
                raise ValueError(f'Unexpected archive member: {member.name}')
            name = PurePosixPath(*pure.parts[1:]).as_posix()
            if name in files:
                raise ValueError(f'Duplicate archive member: {name}')
            if member.size > MAX_FILE_BYTES or total + member.size > MAX_TOTAL_BYTES:
                raise ValueError('Package exceeds static-inspection size limits.')
            total += member.size
            stream = archive.extractfile(member)
            if stream is None:
                raise ValueError(f'Cannot read archive member: {name}')
            files[name] = stream.read()
    return files


def export_targets(value: Any):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for child in value.values():
            yield from export_targets(child)
    elif isinstance(value, list):
        for child in value:
            yield from export_targets(child)


def inspect_files(files: dict[str, bytes], entries: list[str]) -> dict[str, Any]:
    errors: list[str] = []
    notes = ['Static checks do not prove type correctness, runtime compatibility, complete API coverage, or absence of vulnerabilities.']
    try:
        manifest = json.loads(files['package.json'])
    except (KeyError, ValueError, UnicodeError) as exc:
        return {'ok': False, 'errors': [f'Invalid or missing package.json: {exc}'], 'notes': notes}
    if not isinstance(manifest, dict):
        return {'ok': False, 'errors': ['package.json must be an object.'], 'notes': notes}
    if manifest.get('name') != PACKAGE:
        errors.append(f'Expected package name {PACKAGE}.')
    version = manifest.get('version', '')
    if not isinstance(version, str) or not re.fullmatch(r'\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?', version):
        errors.append('A real semantic package version is required.')
    if manifest.get('license') != 'MIT':
        errors.append('Manifest license must be MIT.')
    license_text = files.get('LICENSE', b'').decode('utf-8', errors='replace').replace('\r\n', '\n')
    if 'Copyright (c) 2023 Google LLC.\nCopyright (c) 2026 Ryan Lester.' not in license_text:
        errors.append('LICENSE must retain Google, immediately followed by Ryan Lester.')
    for required in ('Permission is hereby granted, free of charge',
                     'The above copyright notice and this permission notice shall be included',
                     'THE SOFTWARE IS PROVIDED "AS IS"'):
        if required not in license_text:
            errors.append('LICENSE is missing a required MIT clause.')
    peers = manifest.get('peerDependencies', {})
    if not isinstance(peers, dict):
        errors.append('peerDependencies must be an object.'); peers = {}
    for peer in ('@angular/core', '@angular/common', '@angular/forms', '@angular/material', '@angular/cdk'):
        if not isinstance(peers, dict) or not peers.get(peer):
            errors.append(f'Missing required peer: {peer}')
    for field in ('dependencies', 'optionalDependencies', 'peerDependencies'):
        values = manifest.get(field, {})
        if not isinstance(values, dict):
            errors.append(f'{field} must be an object.')
            continue
        for name, value in values.items():
            if ENGINE_RE.fullmatch(name):
                errors.append(f'Deprecated animation dependency in {field}: {name}')
            if field != 'peerDependencies' and name.startswith('@angular/'):
                errors.append(f'Shared Angular package must not be a nested {field}: {name}')
            if not isinstance(value, str) or any(x in value for x in ('PLACEHOLDER', '0.0.0-NG', 'workspace:', 'file:', 'link:')):
                errors.append(f'Unresolved/nonportable dependency {name} in {field}.')
    exports = manifest.get('exports', {})
    if not isinstance(exports, dict):
        errors.append('Explicit package exports object required.')
        exports = {}
    for entry in entries:
        if './' + entry not in exports:
            errors.append(f'Missing legacy entry point: {entry}')
    for key, value in exports.items():
        if key == './*':
            errors.append('Unbounded wildcard exports are prohibited.')
        if key in ('./button', './select', './datepicker', './icon', './core', './table', './form-field'):
            errors.append(f'Current Material mirror entry point is not allowed: {key}')
        for target in export_targets(value):
            if not target.startswith('./') or '..' in PurePosixPath(target).parts:
                errors.append(f'Invalid export target for {key}: {target}')
            elif not any(fnmatch.fnmatchcase(name, target[2:]) for name in files):
                errors.append(f'Missing export target for {key}: {target}')
    root_export = exports.get('.', {})
    if not isinstance(root_export, dict) or not root_export.get('sass'):
        errors.append('Root export must explicitly expose the historical Sass facade.')
    dependencies = manifest.get('dependencies', {})
    if not isinstance(dependencies, dict):
        dependencies = {}
    runtime_text = '\n'.join(data.decode('utf-8', errors='replace') for name, data in files.items()
                             if name.endswith(('.mjs', '.cjs', '.js', '.d.ts')) and not name.startswith(('schematics/', 'migration-runner/', 'tools/')))
    if re.search(r"(?:from\s*|import\s*\(?\s*|require\s*\(\s*)['\"]rxjs(?:/[^'\"]*)?['\"]", runtime_text) and not peers.get('rxjs'):
        errors.append('Direct RxJS runtime/type import requires a declared compatible peer.')
    if re.search(r"(?:from\s*|import\s*\(?\s*|require\s*\(\s*)['\"]tslib['\"]", runtime_text) and not dependencies.get('tslib'):
        errors.append('Emitted tslib import requires a direct runtime dependency.')
    collection = manifest.get('schematics')
    if not isinstance(collection, str) or collection.removeprefix('./') not in files:
        errors.append('Packaged schematic collection is missing.')
    else:
        try:
            definitions = json.loads(files[collection.removeprefix('./')]).get('schematics', {})
            for name in ('migrate-legacy',):
                if name not in definitions:
                    errors.append(f'Missing schematic definition: {name}')
        except (ValueError, UnicodeError, AttributeError):
            errors.append('Invalid schematic collection.')
    for name, data in files.items():
        # Migration code must intentionally recognize old import paths. It is not runtime code.
        if name.startswith(('schematics/', 'migration-runner/', 'tools/')):
            continue
        if not name.endswith(('.mjs', '.cjs', '.js', '.d.ts')):
            continue
        text = data.decode('utf-8', errors='replace')
        for module in module_edges(text):
            if ENGINE_RE.fullmatch(module) or module.startswith('@angular/animations') \
                    or module.startswith('@angular/platform-browser/animations'):
                errors.append(f'Deprecated animation reference in distributed runtime/types: {name}')
                break
        for module in module_edges(text):
            if OLD_LEGACY_RE.fullmatch(module) or module.startswith('@angular/material/legacy-'):
                errors.append(f'Old Material legacy import path in distributed runtime/types: {name}')
                break
    return {'ok': not errors, 'package': manifest.get('name'), 'version': version,
            'file_count': len(files), 'errors': errors, 'notes': notes}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('package', type=Path, help='npm pack tarball, or extracted package directory')
    parser.add_argument('--scope', type=Path,
                        default=Path(__file__).resolve().parents[1] / 'research' / 'scope.json')
    args = parser.parse_args()
    try:
        entries = json.loads(args.scope.read_text(encoding='utf-8'))['preserved_entry_points']
        result = inspect_files(read_package(args.package), entries)
    except (ValueError, OSError, tarfile.TarError, KeyError) as exc:
        result = {'ok': False, 'errors': [str(exc)]}
    print(json.dumps(result, indent=2))
    return 0 if result['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
