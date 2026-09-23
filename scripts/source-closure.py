#!/usr/bin/env python3
"""Inventory the historical source dependency closure from a Git ref without checkout mutation.

This is intentionally conservative and lexical. It follows resolvable relative TypeScript and Sass
edges, component template/style URLs, and records package/deep imports as boundary evidence. It is a
pre-deletion archaeology tool, not a TypeScript/Sass compiler.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from collections import deque
from pathlib import Path, PurePosixPath
from typing import Iterable

TS_EXTS = ('.ts', '.tsx', '.js', '.mjs', '.cjs')
SASS_EXTS = ('.scss', '.sass')
ASSET_EXTS = ('.html', '.css', '.scss', '.sass')
SOURCE_EXTS = TS_EXTS + SASS_EXTS + ASSET_EXTS

TS_SPEC_RE = re.compile(
    r"(?:\bfrom\s*|\bimport\s*\(|\bimport\s+|\bexport\s+[^;]*?\bfrom\s*)[\"']([^\"']+)[\"']",
    re.MULTILINE,
)
SASS_SPEC_RE = re.compile(r"@(use|forward|import)\s+[\"']([^\"']+)[\"']")
TEMPLATE_RE = re.compile(r"\btemplateUrl\s*:\s*[\"']([^\"']+)[\"']")
STYLE_RE = re.compile(r"\bstyleUrl\s*:\s*[\"']([^\"']+)[\"']")
STYLES_RE = re.compile(r"\bstyleUrls\s*:\s*\[([^\]]*)\]", re.DOTALL)
QUOTED_RE = re.compile(r"[\"']([^\"']+)[\"']")


def git(repo: Path, *args: str, check: bool = True) -> str:
    p = subprocess.run(['git', '-C', str(repo), *args], text=True, capture_output=True)
    if check and p.returncode:
        raise RuntimeError(p.stderr.strip() or p.stdout.strip() or f'git failed: {args!r}')
    return p.stdout.strip()


def ref_files(repo: Path, ref: str) -> set[str]:
    out = git(repo, 'ls-tree', '-r', '--name-only', ref)
    return {line.strip() for line in out.splitlines() if line.strip()}


def read_ref(repo: Path, ref: str, path: str) -> str:
    return git(repo, 'show', f'{ref}:{path}')


def norm(base: str, spec: str) -> str:
    p = PurePosixPath(base).parent.joinpath(spec)
    parts: list[str] = []
    for part in p.parts:
        if part in ('', '.'):
            continue
        if part == '..':
            if parts:
                parts.pop()
            else:
                parts.append('..')
        else:
            parts.append(part)
    return '/'.join(parts)


def candidates(base: str, spec: str, sass: bool = False) -> list[str]:
    raw = norm(base, spec)
    p = PurePosixPath(raw)
    result: list[str] = []
    # Historical Material uses `foo.import` Sass module names that resolve to
    # `_foo.import.scss`. Treat non-source suffixes (e.g. `.import`) as part of
    # the basename rather than a final file extension.
    known_exts = set(TS_EXTS + SASS_EXTS + ASSET_EXTS)
    has_known_ext = p.suffix.lower() in known_exts
    if has_known_ext:
        result.append(raw)
    else:
        exts = SASS_EXTS if sass else TS_EXTS + ASSET_EXTS
        for ext in exts:
            result.append(raw + ext)
        for ext in exts:
            result.append(raw + '/index' + ext)
    if sass:
        # Sass partial convention: foo/_bar.scss for `foo/bar` and `_foo.scss` for `foo`.
        parent, name = str(p.parent), p.name
        prefix = '' if parent == '.' else parent + '/'
        if has_known_ext:
            if not name.startswith('_'):
                result.append(prefix + '_' + name)
        else:
            for ext in SASS_EXTS:
                result.append(prefix + '_' + name + ext)
                result.append(raw + '/_index' + ext)
                # Also try underscore form of the full `.import` basename.
                result.append(prefix + '_' + name + ext)
    return list(dict.fromkeys(result))


def resolve_relative(all_files: set[str], base: str, spec: str, sass: bool = False) -> str | None:
    for c in candidates(base, spec, sass=sass):
        if c in all_files:
            return c
    return None


def strip_code_comments(text: str, *, sass: bool = False) -> str:
    """Remove // and /* */ comments so commented @use/@import examples are not edges."""
    # Block comments first
    out = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
    # Line comments (Sass and TS/JS)
    out = re.sub(r'(?m)^[ \t]*//.*?$', '', out)
    # Trailing // comments on code lines (avoid URLs with :// by requiring start or whitespace)
    out = re.sub(r'(?<!:)//.*?$', '', out, flags=re.MULTILINE)
    return out



def parse_edges(path: str, text: str, all_files: set[str]) -> tuple[list[dict], list[dict]]:
    edges: list[dict] = []
    unresolved: list[dict] = []
    suffix = PurePosixPath(path).suffix.lower()

    def add(spec: str, kind: str, sass: bool = False) -> None:
        # Documentation placeholders like <legacy-component> are not filesystem edges.
        if '<' in spec or '>' in spec:
            return
        if spec.startswith('.'):
            target = resolve_relative(all_files, path, spec, sass=sass)
            if target:
                edges.append({'from': path, 'to': target, 'kind': kind, 'specifier': spec, 'scope': 'relative'})
            else:
                unresolved.append({'from': path, 'kind': kind, 'specifier': spec})
        else:
            edges.append({'from': path, 'to': spec, 'kind': kind, 'specifier': spec, 'scope': 'package'})

    code = strip_code_comments(text, sass=suffix in SASS_EXTS)
    if suffix in TS_EXTS:
        for spec in TS_SPEC_RE.findall(code):
            add(spec, 'ts-import-or-export')
        for spec in TEMPLATE_RE.findall(code):
            add(spec, 'template-url')
        for spec in STYLE_RE.findall(code):
            add(spec, 'style-url')
        for block in STYLES_RE.findall(code):
            for spec in QUOTED_RE.findall(block):
                add(spec, 'style-url')
    if suffix in SASS_EXTS:
        for directive, spec in SASS_SPEC_RE.findall(code):
            # CSS imports and package module URLs are recorded but not traversed.
            add(spec, f'sass-{directive}', sass=True)
    return edges, unresolved


def classify_target(target: str) -> str:
    if target.startswith('@angular/cdk'):
        return 'cdk-package'
    if target.startswith('@angular/material/legacy-') or target == '@angular/material/core':
        return 'material-package-legacy-or-core'
    if target.startswith('@angular/material/'):
        return 'material-package-ordinary'
    if target.startswith('@angular/'):
        return 'angular-package'
    if target.startswith('@') or '/' not in target or target.startswith(('rxjs', 'tslib')):
        return 'external-package'
    if target.startswith('src/material/legacy-') or target.startswith('src/material/legacy-core'):
        return 'legacy-tree'
    if target.startswith('src/material/'):
        return 'ordinary-material-tree'
    if target.startswith('src/cdk/'):
        return 'cdk-tree'
    return 'repository-file'


def default_roots(all_files: set[str]) -> list[str]:
    prefixes = sorted({
        '/'.join(p.split('/')[:3])
        for p in all_files
        if p.startswith('src/material/legacy-') and len(p.split('/')) >= 4
    })
    roots = [p for p in all_files if any(p.startswith(prefix + '/') for prefix in prefixes)]
    return sorted(roots)


def inventory(repo: Path, ref: str, roots: Iterable[str] | None = None) -> dict:
    all_files = ref_files(repo, ref)
    start = sorted(set(roots or default_roots(all_files)))
    missing = [p for p in start if p not in all_files]
    if missing:
        raise ValueError(f'Root files not present at {ref}: {missing[:5]}')

    q = deque(start)
    visited: set[str] = set()
    edges: list[dict] = []
    unresolved: list[dict] = []
    while q:
        path = q.popleft()
        if path in visited:
            continue
        visited.add(path)
        if PurePosixPath(path).suffix.lower() not in SOURCE_EXTS:
            continue
        try:
            text = read_ref(repo, ref, path)
        except UnicodeDecodeError:
            continue
        e, u = parse_edges(path, text, all_files)
        edges.extend(e); unresolved.extend(u)
        for edge in e:
            target = edge['to']
            if edge['scope'] == 'relative' and target in all_files and target not in visited:
                q.append(target)

    # Deduplicate deterministically.
    edge_key = lambda x: (x['from'], x['to'], x['kind'], x['specifier'], x['scope'])
    unique_edge_tuples = sorted({edge_key(x) for x in edges})
    edges = [
        {'from': a, 'to': b, 'kind': c, 'specifier': d, 'scope': e}
        for a, b, c, d, e in unique_edge_tuples
    ]
    unresolved = sorted({json.dumps(x, sort_keys=True): x for x in unresolved}.values(), key=lambda x:(x['from'],x['kind'],x['specifier']))

    boundaries: list[dict] = []
    for edge in edges:
        target = edge['to']
        cls = classify_target(target)
        if cls not in ('legacy-tree', 'repository-file'):
            boundaries.append({**edge, 'classification': cls})

    return {
        'schema_version': 1,
        'repository': str(repo.resolve()),
        'ref': ref,
        'resolved_commit': git(repo, 'rev-parse', f'{ref}^{{commit}}'),
        'root_file_count': len(start),
        'visited_file_count': len(visited),
        'roots': start,
        'visited_files': sorted(visited),
        'edges': edges,
        'boundary_edges': boundaries,
        'unresolved_relative_edges': unresolved,
        'limitations': [
            'Lexical inventory only; dynamic imports, Sass module configuration semantics and template-driven Angular dependencies require compiler-aware follow-up.',
            'Package imports are classified but not resolved into package source.',
            'An unresolved relative edge is evidence requiring review, not proof the target is absent.'
        ],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('repository', type=Path)
    ap.add_argument('--ref', default='16.2.14')
    ap.add_argument('--root', action='append', default=[], help='Specific root file at the Git ref; repeatable. Defaults to all src/material/legacy-* files.')
    ap.add_argument('--output', type=Path)
    args = ap.parse_args()
    data = inventory(args.repository, args.ref, args.root or None)
    payload = json.dumps(data, indent=2, sort_keys=True) + '\n'
    if args.output:
        if args.output.exists():
            raise SystemExit(f'Refusing to overwrite existing output: {args.output}')
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload)
    else:
        print(payload, end='')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
