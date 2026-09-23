#!/usr/bin/env python3
"""List commits touching relevant Angular Components paths between two refs for audit classification."""
from __future__ import annotations
import argparse,json,subprocess
from pathlib import Path

def git(repo:Path,*args:str)->str:
    p=subprocess.run(['git','-C',str(repo),*args],text=True,capture_output=True)
    if p.returncode:raise RuntimeError(p.stderr.strip() or p.stdout.strip())
    return p.stdout

def load_paths(path:Path)->list[str]:
    d=json.loads(path.read_text());out=[]
    for k,v in d.items():
        if k.endswith('_paths') and isinstance(v,list):out.extend(v)
    return sorted(dict.fromkeys(out))

def inventory(repo:Path,from_ref:str,to_ref:str,paths:list[str])->dict:
    if not paths:raise ValueError('No audit paths supplied')
    from_sha=git(repo,'rev-parse',f'{from_ref}^{{commit}}').strip();to_sha=git(repo,'rev-parse',f'{to_ref}^{{commit}}').strip()
    # Record-separator-delimited commit metadata followed by NUL-separated names.
    fmt='--format=%x1e%H%x1f%aI%x1f%s'
    out=git(repo,'log','--reverse',fmt,'--name-only',f'{from_ref}..{to_ref}','--',*paths)
    commits=[]
    for block in out.split('\x1e'):
        block=block.strip('\n')
        if not block:continue
        lines=block.splitlines();meta=lines[0].split('\x1f',2)
        if len(meta)!=3:continue
        sha,date,subject=meta
        touched=sorted({x.strip() for x in lines[1:] if x.strip()})
        commits.append({'sha':sha,'date':date,'subject':subject,'paths':touched,'review_status':'unreviewed'})
    return {'schema_version':1,'from':from_ref,'from_commit':from_sha,'to':to_ref,'to_commit':to_sha,'audit_paths':paths,'commit_count':len(commits),'commits':commits,
            'inventory_role':'research-only','selects_release_baseline':False,
            'review_policy_file':'research/upstream-audit-policy.json',
            'required_disposition':'Every SHA needs an individual disposition or explicit evidence-backed low-risk batch. Review depth is risk-weighted; sensitive, behavioral and uncertain changes require individual review. security-review remains pending. Inherited fixes must exist in each selected release baseline. Expand audit paths from source closure; this inventory is not audit completion.'}

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('repository',type=Path);ap.add_argument('--from-ref',default='16.2.14');ap.add_argument('--to-ref',required=True,help='Research source ref to enumerate; does not select a release dependency baseline');ap.add_argument('--paths-file',type=Path,default=Path(__file__).resolve().parents[1]/'research/upstream-audit-paths.json');ap.add_argument('--path',action='append',default=[]);ap.add_argument('--output',type=Path)
    a=ap.parse_args();paths=load_paths(a.paths_file)+a.path;r=inventory(a.repository,a.from_ref,a.to_ref,sorted(dict.fromkeys(paths)));payload=json.dumps(r,indent=2,sort_keys=True)+'\n'
    if a.output:
        if a.output.exists():raise SystemExit(f'Refusing to overwrite {a.output}')
        a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(payload)
    else:print(payload,end='')
    return 0
if __name__=='__main__':raise SystemExit(main())
