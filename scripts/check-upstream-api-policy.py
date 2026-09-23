#!/usr/bin/env python3
"""Fail when shipped implementation uses forbidden/private/deprecated-upstream surfaces.

This is a conservative textual/static guardrail. It complements TypeScript/Sass builds and the
maintainer-owned upstream dependency ledger; it does not determine whether an arbitrary public API
has become deprecated unless that fact is added to policy/ledger data.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

TEXT_EXTS = {'.ts','.tsx','.js','.mjs','.cjs','.scss','.sass'}
IMPORT_RE = re.compile(r"(?:\bfrom\s*|\bimport\s*\(|\bimport\s+)[\"']([^\"']+)[\"']")
NAMED_IMPORT_RE = re.compile(r"\bimport\s*\{([^}]*)\}\s*from\s*[\"']([^\"']+)[\"']", re.DOTALL)
REEXPORT_RE = re.compile(r"\bexport\s*\{([^}]*)\}\s*from\s*[\"']([^\"']+)[\"']", re.DOTALL)
SASS_USE_RE = re.compile(r"@(use|forward|import)\s+[\"']([^\"']+)[\"']")


def iter_files(root: Path):
    if root.is_file():
        if root.suffix.lower() in TEXT_EXTS:
            yield root
        return
    for p in sorted(root.rglob('*')):
        if p.is_file() and not p.is_symlink() and p.suffix.lower() in TEXT_EXTS:
            yield p


def imported_names(block: str) -> list[str]:
    out=[]
    for part in block.split(','):
        token=part.strip()
        if not token:
            continue
        # Handles `type Foo`, `Foo as Bar` and comments poorly by design; false positives fail closed.
        token=re.sub(r'^type\s+','',token)
        source=token.split(' as ',1)[0].strip()
        if source:
            out.append(source)
    return out


def load_policy(path: Path) -> dict:
    data=json.loads(path.read_text())
    if data.get('version') != 1:
        raise ValueError('Unsupported policy version')
    return data


def scan(root: Path, policy: dict) -> dict:
    violations=[]
    forbidden_modules=set(policy.get('forbidden_modules',[]))
    forbidden_substrings=policy.get('forbidden_module_substrings',[])
    prefixes=tuple(policy.get('forbidden_imported_symbol_prefixes',[]))
    sass_patterns=policy.get('forbidden_sass_patterns',[])
    exceptions=policy.get('exceptions',[])

    def exempt(rel: str, rule: str, value: str) -> bool:
        for e in exceptions:
            if e.get('path') == rel and e.get('rule') == rule and e.get('value') == value:
                return True
        return False

    for p in iter_files(root):
        rel=p.relative_to(root).as_posix() if root.is_dir() else p.name
        text=p.read_text(errors='replace')
        modules=[]
        modules += IMPORT_RE.findall(text)
        modules += [m for _,m in SASS_USE_RE.findall(text)]
        for module in modules:
            if module in forbidden_modules and not exempt(rel,'forbidden-module',module):
                violations.append({'path':rel,'rule':'forbidden-module','value':module})
            for needle in forbidden_substrings:
                if needle in module and module.startswith('@angular/') and not exempt(rel,'forbidden-module-substring',needle):
                    violations.append({'path':rel,'rule':'forbidden-module-substring','value':module,'needle':needle})
        for regex in (NAMED_IMPORT_RE, REEXPORT_RE):
            for names,module in regex.findall(text):
                if not module.startswith(('@angular/','rxjs','typescript')):
                    continue
                for name in imported_names(names):
                    if prefixes and name.startswith(prefixes) and not exempt(rel,'forbidden-symbol-prefix',name):
                        violations.append({'path':rel,'rule':'forbidden-symbol-prefix','value':name,'module':module})
        if p.suffix.lower() in {'.scss','.sass'}:
            for pat in sass_patterns:
                if pat in text and not exempt(rel,'forbidden-sass-pattern',pat):
                    violations.append({'path':rel,'rule':'forbidden-sass-pattern','value':pat})
    violations=sorted({json.dumps(x,sort_keys=True):x for x in violations}.values(), key=lambda x:(x['path'],x['rule'],x['value']))
    return {'ok': not violations, 'scanned_root':str(root.resolve()), 'violations':violations, 'violation_count':len(violations)}


def main() -> int:
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('root',type=Path,help='Shipped source/Sass root to scan. Do not point at historical research/reference fixtures.')
    ap.add_argument('--policy',type=Path,default=Path(__file__).resolve().parents[1]/'research/upstream-api-policy.json')
    ap.add_argument('--report',type=Path)
    args=ap.parse_args()
    if not args.root.exists(): raise SystemExit(f'Root does not exist: {args.root}')
    result=scan(args.root,load_policy(args.policy))
    payload=json.dumps(result,indent=2,sort_keys=True)+'\n'
    if args.report:
        if args.report.exists(): raise SystemExit(f'Refusing to overwrite report: {args.report}')
        args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(payload)
    else: print(payload,end='')
    return 0 if result['ok'] else 1

if __name__=='__main__':
    raise SystemExit(main())
