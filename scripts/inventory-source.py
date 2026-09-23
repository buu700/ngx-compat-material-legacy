#!/usr/bin/env python3
"""Read a tagged local Angular Components repository without checking it out or changing it.

Enumerates files and explicit root Sass exports. TS imports are lexical leads, not a
complete type/API/dependency analysis; resolve export-star/inheritance with TypeScript.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path
from typing import Any


def git(repo: Path, *args: str) -> str:
    return subprocess.run(['git','-C',str(repo),*args],check=True,capture_output=True,text=True,timeout=60).stdout


def named_forwards(text: str) -> dict[str, Any]:
    # Handle explicit, static @forward declarations only. Wildcards remain unresolved.
    clean = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    clean = re.sub(r'(?m)//[^\n]*', '', clean)
    names = set(); directives = []
    for m in re.finditer(r'@forward\s+([\'\"])(.*?)\1\s*([^;]*);', clean, re.S):
        source, tail = m.group(2), m.group(3).strip()
        show = re.search(r'\bshow\s+(.+?)(?:\bwith\s*\(|$)', tail, re.S)
        found = re.findall(r'\$?[A-Za-z_][\w-]*', show.group(1)) if show else []
        names.update(found)
        directives.append({'source':source,'modifiers':tail,'explicit_names':found,'requires_resolution':show is None})
    return {'explicit_named_exports':sorted(names),'forwards':directives,
            'warning':'Names in prefixed show clauses are already exposed spellings. Private/internal classification and wildcard expansion need source/metadata review.'}


def inventory(repo: Path, ref: str) -> dict[str, Any]:
    if not re.fullmatch(r'[A-Za-z0-9_./-]+',ref) or ref.startswith('-') or '..' in ref:
        raise ValueError('Use a simple local tag/ref or full commit; no revision expressions.')
    commit=git(repo,'rev-parse','--verify',ref+'^{commit}').strip()
    files=git(repo,'ls-tree','-r','--name-only',commit,'--','src/material').splitlines()
    entries=sorted({f.split('/')[2] for f in files if len(f.split('/'))>3 and f.split('/')[2].startswith('legacy-')})
    groups=[]
    for ep in entries:
        members=[f for f in files if f.startswith('src/material/'+ep+'/')]
        records=[]; imports=set(); private_candidates=set()
        for f in members:
            if not f.endswith(('.ts','.scss','.html')):continue
            text=git(repo,'show',commit+':'+f)
            if f.endswith('.ts'):
                for m in re.finditer(r'\b(?:from|import)\s*\(?\s*[\'\"](@angular/[^\'\"]+)[\'\"]',text):imports.add(m.group(1))
                for m in re.finditer(r'\b(_Mat\w+|_\w+Base)\b',text):private_candidates.add(m.group(1))
            records.append({'path':f,'sha256':hashlib.sha256(text.encode()).hexdigest(),'lines':len(text.splitlines())})
        groups.append({'entry_point':ep,'files':records,'public_api_files':[f for f in members if f.endswith('/public-api.ts')],
                       'test_files':[f for f in members if f.endswith('.spec.ts')],
                       'angular_import_leads':sorted(imports),'private_symbol_leads':sorted(private_candidates)})
    root='src/material/_index.scss'
    sass=named_forwards(git(repo,'show',commit+':'+root)) if root in files else None
    return {'baseline_ref':ref,'full_commit':commit,'entry_point_count':len(groups),'entries':groups,'root_sass':sass,
            'limitations':['Static lexical TS leads; comments and re-exports may require disambiguation.','No complete inherited public type inventory or Sass evaluation.','No source modifications, build or compatibility tests performed.']}


def main() -> int:
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('repository',type=Path);ap.add_argument('--ref',default='16.2.14');ap.add_argument('--output',type=Path)
    a=ap.parse_args()
    try:r=inventory(a.repository,a.ref)
    except (OSError,ValueError,subprocess.SubprocessError) as exc:
        print(json.dumps({'ok':False,'error':str(exc)},indent=2));return 1
    data=json.dumps(r,indent=2)+'\n'
    if a.output:
        if a.output.exists():ap.error('Refusing to overwrite existing inventory evidence.')
        a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(data)
    else:print(data,end='')
    return 0

if __name__=='__main__':raise SystemExit(main())
