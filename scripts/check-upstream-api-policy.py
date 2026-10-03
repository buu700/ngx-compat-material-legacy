#!/usr/bin/env python3
"""Fail when shipped implementation uses forbidden/private/deprecated-upstream surfaces.

Syntax-aware enough for policy: strips line/block comments before matching import/export
lists so comment-only mentions and comments inside re-export lists do not create false
positives or bypasses. Still conservative: unresolved computed module loads fail closed
when written as literal strings in import()/require().
"""
from __future__ import annotations

import argparse
import json
import re
import tarfile
import tempfile
from pathlib import Path, PurePosixPath

TEXT_EXTS = {'.ts', '.tsx', '.js', '.mjs', '.cjs', '.scss', '.sass'}

# Captures module specifiers from import/export/require/dynamic import.
_MODULE_EDGE = re.compile(
    r"""(?:
          (?:^|[;{}\n])\s*import\s*(?:type\s+)?(?:[\w*{}$,\s]+?\s+from\s*)?\s*['"]([^'"]+)['"]
        | (?:^|[;{}\n])\s*export\s*(?:type\s+)?(?:\{[^}]*\}\s*from\s*|\*\s*(?:as\s+\w+\s+)?from\s*)\s*['"]([^'"]+)['"]
        | \bimport\s*\(\s*['"]([^'"]+)['"]
        | \brequire\s*\(\s*['"]([^'"]+)['"]
        )""",
    re.MULTILINE | re.VERBOSE,
)

_NAMED_FROM = re.compile(
    r"""(?:import|export)\s*(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]""",
    re.MULTILINE | re.DOTALL,
)
_NAMESPACE_IMPORT = re.compile(
    r"""import\s*\*\s*as\s+(\w+)\s*from\s*['"](@angular/[^'"]+)['"]"""
)
_REQUIRE_ALIAS = re.compile(
    r"""(?:import|const|let|var)\s+(\w+)\s*=\s*require\(\s*['"](@angular/[^'"]+)['"]\s*\)"""
)
_NAMESPACE_MEMBER = re.compile(
    r"""\b(\w+)\s*(?:\.\s*([A-Za-z_$][\w$]*)|\[\s*['"]([A-Za-z_$][\w$]*)['"]\s*\])"""
)

_SASS_USE = re.compile(r"""@(?:use|forward)\s+['"]([^'"]+)['"](?:\s+as\s+([\w*]+))?""")
_SASS_IMPORT = re.compile(r"""@import\s+['"]([^'"]+)['"]""")
_EXTENDS = re.compile(r"""\bclass\s+[A-Za-z_$][\w$]*(?:\s*<[^;{]*>)?\s+extends\s+([A-Za-z_$][\w$]*)""")
_DTS_REF = re.compile(r"""///\s*<reference\s+(?:path|types)\s*=\s*['"]([^'"]+)['"]""")
_BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.DOTALL)
_LINE_COMMENT = re.compile(r"(^|[^:])//.*?$", re.MULTILINE)


def strip_comments(text: str) -> str:
    text = _BLOCK_COMMENT.sub('', text)
    text = _LINE_COMMENT.sub(r'\1', text)
    return text


def iter_files(root: Path):
    if root.is_file():
        if root.suffix.lower() in TEXT_EXTS:
            yield root
        return
    for p in sorted(root.rglob('*')):
        if p.is_file() and not p.is_symlink() and p.suffix.lower() in TEXT_EXTS:
            yield p


def imported_names(block: str) -> list[str]:
    out = []
    for part in block.split(','):
        token = part.strip()
        if not token:
            continue
        token = re.sub(r'^type\s+', '', token)
        source = token.split(' as ', 1)[0].strip()
        # Drop residual comment fragments if any slipped through.
        source = source.split('\n')[0].strip()
        if source and re.match(r'^[\w$]+$', source):
            out.append(source)
    return out


def module_edges(text: str) -> list[str]:
    out = []
    for m in _MODULE_EDGE.finditer(text):
        out.append(next(g for g in m.groups() if g is not None))
    return out


def load_policy(path: Path) -> dict:
    data = json.loads(path.read_text())
    if data.get('version') != 1:
        raise ValueError('Unsupported policy version')
    return data


def _extract_package(tarball: Path, dest: Path) -> None:
    """Materialize npm-pack members so the policy scan binds to artifact bytes."""
    with tarfile.open(tarball, mode='r:*') as archive:
        for member in archive:
            pure = PurePosixPath(member.name)
            if pure.is_absolute() or '..' in pure.parts:
                raise ValueError(f'Unsafe archive path: {member.name}')
            if member.issym() or member.islnk() or member.isdir():
                if member.issym() or member.islnk():
                    raise ValueError(f'Archive links not accepted: {member.name}')
                continue
            if not member.isfile() or not pure.parts or pure.parts[0] != 'package':
                raise ValueError(f'Unexpected archive member: {member.name}')
            name = PurePosixPath(*pure.parts[1:])
            if name.suffix.lower() not in TEXT_EXTS:
                continue
            target = dest.joinpath(*name.parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            source = archive.extractfile(member)
            if source is None:
                raise ValueError(f'Unreadable archive member: {member.name}')
            target.write_bytes(source.read())


def scan(root: Path, policy: dict) -> dict:
    if root.is_file() and (root.suffix == '.tgz' or root.name.endswith('.tar.gz')):
        with tempfile.TemporaryDirectory(prefix='policy-tarball-') as tmp:
            extracted = Path(tmp)
            _extract_package(root, extracted)
            result = _scan_tree(extracted, policy)
        result['scanned_root'] = str(root.resolve())
        result['scanned_artifact'] = 'tarball'
        return result
    return _scan_tree(root, policy)


def _scan_tree(root: Path, policy: dict) -> dict:
    violations = []
    forbidden_modules = set(policy.get('forbidden_modules', []))
    forbidden_substrings = policy.get('forbidden_module_substrings', [])
    prefixes = tuple(policy.get('forbidden_imported_symbol_prefixes', []))
    forbidden_symbols = set(policy.get('forbidden_imported_symbols', []))
    deprecated_symbols = set(policy.get('forbidden_deprecated_symbols', []))
    sass_patterns = policy.get('forbidden_sass_patterns', [])
    exceptions = policy.get('exceptions', [])

    def exempt(rel: str, rule: str, value: str) -> bool:
        for e in exceptions:
            if e.get('path') == rel and e.get('rule') == rule and e.get('value') == value:
                return True
        return False

    for p in iter_files(root):
        rel = p.relative_to(root).as_posix() if root.is_dir() else p.name
        raw = p.read_text(errors='replace')
        text = strip_comments(raw)

        if p.suffix.lower() in {'.ts', '.tsx', '.js', '.mjs', '.cjs'}:
            for module in module_edges(text):
                if module in forbidden_modules and not exempt(rel, 'forbidden-module', module):
                    violations.append({'path': rel, 'rule': 'forbidden-module', 'value': module})
                for needle in forbidden_substrings:
                    if needle in module and module.startswith('@angular/') and not exempt(
                        rel, 'forbidden-module-substring', needle
                    ):
                        violations.append(
                            {
                                'path': rel,
                                'rule': 'forbidden-module-substring',
                                'value': module,
                                'needle': needle,
                            }
                        )
                if module.startswith('@angular/'):
                    segments = [part for part in module.split('/') if part]
                    if any(part in {'private', 'src'} for part in segments) and not exempt(
                        rel, 'forbidden-deep-internal', module
                    ):
                        violations.append(
                            {'path': rel, 'rule': 'forbidden-deep-internal', 'value': module}
                        )
            imported: dict[str, str] = {}
            for names, module in _NAMED_FROM.findall(text):
                if module.startswith('@angular/'):
                    for name in imported_names(names):
                        imported.setdefault(name, module)
            for base in _EXTENDS.findall(text):
                module = imported.get(base)
                if not module:
                    continue
                if prefixes and base.startswith(prefixes) and not exempt(rel, 'forbidden-symbol-prefix', base):
                    violations.append(
                        {
                            'path': rel,
                            'rule': 'forbidden-symbol-prefix',
                            'value': base,
                            'module': module,
                            'access': 'inheritance',
                        }
                    )
                if base in forbidden_symbols and not exempt(rel, 'forbidden-symbol', base):
                    violations.append(
                        {
                            'path': rel,
                            'rule': 'forbidden-symbol',
                            'value': base,
                            'module': module,
                            'access': 'inheritance',
                        }
                    )
                if base in deprecated_symbols and not exempt(rel, 'forbidden-deprecated-symbol', base):
                    violations.append(
                        {
                            'path': rel,
                            'rule': 'forbidden-deprecated-symbol',
                            'value': base,
                            'module': module,
                            'access': 'inheritance',
                        }
                    )
            for ref in _DTS_REF.findall(raw):
                if '@angular/' in ref and (
                    '/private' in ref or '/src/' in ref or ref.endswith('/src')
                ) and not exempt(rel, 'forbidden-dts-reference', ref):
                    violations.append({'path': rel, 'rule': 'forbidden-dts-reference', 'value': ref})
            bindings = {alias: module for alias, module in _NAMESPACE_IMPORT.findall(text)}
            bindings.update({alias: module for alias, module in _REQUIRE_ALIAS.findall(text)})
            for alias, member, computed in _NAMESPACE_MEMBER.findall(text):
                module = bindings.get(alias)
                if not module or not module.startswith('@angular/'):
                    continue
                name = member or computed
                if prefixes and name.startswith(prefixes) and not exempt(
                    rel, 'forbidden-symbol-prefix', name
                ):
                    violations.append(
                        {
                            'path': rel,
                            'rule': 'forbidden-symbol-prefix',
                            'value': name,
                            'module': module,
                            'access': 'namespace',
                        }
                    )
                if name in forbidden_symbols and not exempt(rel, 'forbidden-symbol', name):
                    violations.append(
                        {
                            'path': rel,
                            'rule': 'forbidden-symbol',
                            'value': name,
                            'module': module,
                            'access': 'namespace',
                        }
                    )
            for names, module in _NAMED_FROM.findall(text):
                if not module.startswith(('@angular/', 'rxjs', 'typescript')):
                    continue
                for name in imported_names(names):
                    if name in deprecated_symbols and module.startswith('@angular/') and not exempt(
                        rel, 'forbidden-deprecated-symbol', name
                    ):
                        violations.append(
                            {
                                'path': rel,
                                'rule': 'forbidden-deprecated-symbol',
                                'value': name,
                                'module': module,
                            }
                        )
                    if prefixes and name.startswith(prefixes) and not exempt(
                        rel, 'forbidden-symbol-prefix', name
                    ):
                        violations.append(
                            {
                                'path': rel,
                                'rule': 'forbidden-symbol-prefix',
                                'value': name,
                                'module': module,
                            }
                        )
                    if name in forbidden_symbols and module.startswith('@angular/') and not exempt(
                        rel, 'forbidden-symbol', name
                    ):
                        violations.append(
                            {
                                'path': rel,
                                'rule': 'forbidden-symbol',
                                'value': name,
                                'module': module,
                            }
                        )

        if p.suffix.lower() in {'.scss', '.sass'}:
            # Resolve @use/@forward regardless of namespace alias (mat, upstream, m, *).
            for mod, _alias in _SASS_USE.findall(text):
                for pat in sass_patterns:
                    # Pattern may be literal mat.m2- in source text OR a forbidden module path.
                    if pat.startswith('@use ') or pat.startswith('@include '):
                        continue
            for pat in sass_patterns:
                if pat in text and not exempt(rel, 'forbidden-sass-pattern', pat):
                    # For mat.m2- style, also catch alias.m2- by checking loaded modules.
                    if pat.startswith('mat.m2-') or pat.startswith('mat.$m2-'):
                        # Flag if any @use of @angular/material loads m2 members via any alias.
                        # Keep literal match as today, plus namespace-agnostic check below.
                        violations.append({'path': rel, 'rule': 'forbidden-sass-pattern', 'value': pat})
                    else:
                        violations.append({'path': rel, 'rule': 'forbidden-sass-pattern', 'value': pat})
            for mod in [item[0] for item in _SASS_USE.findall(text)] + _SASS_IMPORT.findall(text):
                concealed = (
                    mod.startswith('@material/')
                    or '/node_modules/@material/' in mod
                    or (mod.startswith('@angular/') and ('/src/' in mod or '/private' in mod))
                )
                if concealed and not exempt(rel, 'forbidden-sass-dependency', mod):
                    violations.append({'path': rel, 'rule': 'forbidden-sass-dependency', 'value': mod})
            for mod, alias in _SASS_USE.findall(text):
                if '@angular/material' in mod:
                    # Namespace-agnostic m2- usage: `<alias>.m2-` or `*` members still appear as m2-
                    ns = alias or 'mat'
                    if ns == '*':
                        if re.search(r'\bm2-', text) and not exempt(rel, 'forbidden-sass-pattern', 'm2-via-star'):
                            violations.append(
                                {'path': rel, 'rule': 'forbidden-sass-pattern', 'value': 'm2-via-star-namespace'}
                            )
                    else:
                        needle = f'{ns}.m2-'
                        if needle in text and not exempt(rel, 'forbidden-sass-pattern', needle):
                            violations.append(
                                {'path': rel, 'rule': 'forbidden-sass-pattern', 'value': needle}
                            )

    violations = sorted(
        {json.dumps(x, sort_keys=True): x for x in violations}.values(),
        key=lambda x: (x['path'], x['rule'], x['value']),
    )
    return {
        'ok': not violations,
        'scanned_root': str(root.resolve()),
        'violations': violations,
        'violation_count': len(violations),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        'root',
        type=Path,
        help='Shipped source/Sass root to scan. Do not point at historical research/reference fixtures.',
    )
    ap.add_argument(
        '--policy',
        type=Path,
        default=Path(__file__).resolve().parents[1] / 'research' / 'upstream-api-policy.json',
    )
    ap.add_argument('--report', type=Path)
    args = ap.parse_args()
    if not args.root.exists():
        raise SystemExit(f'Root does not exist: {args.root}')
    result = scan(args.root, load_policy(args.policy))
    payload = json.dumps(result, indent=2, sort_keys=True) + '\n'
    if args.report:
        if args.report.exists():
            raise SystemExit(f'Refusing to overwrite report: {args.report}')
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(payload)
    else:
        print(payload, end='')
    return 0 if result['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
