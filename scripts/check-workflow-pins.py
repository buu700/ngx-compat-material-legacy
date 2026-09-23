#!/usr/bin/env python3
"""Require third-party GitHub Actions to be pinned to immutable full commit SHAs."""
from __future__ import annotations
import argparse,json,re
from pathlib import Path

USES_RE=re.compile(r"^\s*(?:-\s*)?uses\s*:\s*['\"]?([^\s'\"#]+)",re.MULTILINE)
SHA_RE=re.compile(r'^[0-9a-fA-F]{40}$')

def scan(root:Path)->dict:
    files=[]
    if root.is_file(): files=[root]
    else:
        for pat in ('*.yml','*.yaml'): files.extend((root/'.github/workflows').glob(pat) if (root/'.github/workflows').exists() else root.glob(pat))
    bad=[];seen=[]
    for p in sorted(set(files)):
        text=p.read_text(errors='replace')
        for use in USES_RE.findall(text):
            seen.append({'path':str(p),'uses':use})
            if use.startswith('./'):
                continue
            if use.startswith('docker://'):
                if not re.fullmatch(r'docker://[^\s@]+@sha256:[0-9a-fA-F]{64}',use):
                    bad.append({'path':str(p),'uses':use,'reason':'docker-image-not-digest-pinned'})
                continue
            if '@' not in use:
                bad.append({'path':str(p),'uses':use,'reason':'missing-ref'});continue
            _,ref=use.rsplit('@',1)
            if not SHA_RE.fullmatch(ref):
                bad.append({'path':str(p),'uses':use,'reason':'not-full-40-char-sha'})
    return {'ok':not bad,'actions':seen,'violations':bad,'violation_count':len(bad)}

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('root',type=Path);ap.add_argument('--report',type=Path);a=ap.parse_args()
    r=scan(a.root);payload=json.dumps(r,indent=2,sort_keys=True)+'\n'
    if a.report:
        if a.report.exists():raise SystemExit(f'Refusing to overwrite {a.report}')
        a.report.parent.mkdir(parents=True,exist_ok=True);a.report.write_text(payload)
    else:print(payload,end='')
    return 0 if r['ok'] else 1
if __name__=='__main__':raise SystemExit(main())
