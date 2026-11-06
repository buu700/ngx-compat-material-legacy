# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Run mutating import controls only in a new disposable copy, preserving caller sources."""
import argparse,hashlib,json,os,shutil,subprocess,sys,tempfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--root',type=Path,required=True);p.add_argument('--line',choices=['21.x','main'],required=True);p.add_argument('--packet',type=Path,required=True);p.add_argument('--out',type=Path,required=True);args=p.parse_args();root=args.root.resolve();raw=args.packet.read_bytes();packet=json.loads(raw)
if packet['body']['line']!=args.line:raise ValueError('wrong fixture line')
watch=['scripts/sass-private-card-gate.mjs','scripts/sass_private_card_gate.py','scripts/private-card-composition.mjs','scripts/private_card_composition.py','scripts/sass-expected-snapshot-engine.mjs','scripts/private-card-expected-isolated-entry.mjs','fixtures/sass/private-card-expected-isolation-inputs.json']
before={n:hashlib.sha256((root/n).read_bytes()).hexdigest() for n in watch}
with tempfile.TemporaryDirectory(prefix='ngx-private-card-isolation-test-') as tmp:
    copy=Path(tmp)/'source';copy.mkdir()
    def ignore(d,names):return [n for n in names if n in ('node_modules','.git','artifacts','__pycache__') or n.endswith(('.tar.gz','.tgz','.pyc','.json.gz')) or Path(d).name=='compatibility' and n=='f10' or Path(d).name=='rc' and n=='reports']
    for name in ['scripts','tests','fixtures','projects','reference','compatibility','research','work-items','tools','src','integration','migration','goldens','guides','apps','chainman','nix','templates','test','testing','docs']:
        if (root/name).exists():shutil.copytree(root/name,copy/name,ignore=ignore,symlinks=True)
    for name in ['package.json','toolchain-lock.json','.node-version','.npm-version','pnpm-lock.yaml']:
        if (root/name).exists():shutil.copyfile(root/name,copy/name)
    gitdir=subprocess.check_output(['git','rev-parse','--absolute-git-dir'],cwd=root,text=True).strip();(copy/'.git').write_text('gitdir: '+gitdir+'\n')
    (copy/'node_modules/@angular').mkdir(parents=True)
    for name in ['core','material','cdk']:(copy/'node_modules/@angular'/name).symlink_to((root/'node_modules/@angular'/name).resolve(),target_is_directory=True)
    (copy/'node_modules/sass').symlink_to((root/'node_modules/sass').resolve(),target_is_directory=True);(copy/'.sass-isolation-disposable').write_text('test-owned-disposable\n')
    body=packet['body'];actual=dict(caseId=body['case_id'],expected=body['expected'],actual=body['actual'],identity=body['identity'],descriptor=body['current_private_card']);actual_path=Path(tmp)/'actual.json';actual_path.write_text(json.dumps(actual));packet_path=Path(tmp)/'packet.json';packet_path.write_bytes(raw)
    commands=[['node',str(copy/'tests/sass-private-card-isolation-regression.mjs'),str(copy),args.line,str(actual_path)],[sys.executable,str(copy/'tests/sass_private_card_isolation_regression.py'),str(copy),args.line,str(packet_path)]]
    results=[]
    for command in commands:
        r=subprocess.run(command,cwd=copy,text=True,capture_output=True,timeout=180);results.append(dict(command=command,exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr))
        if r.returncode!=0:break
    after={n:hashlib.sha256((root/n).read_bytes()).hexdigest() for n in watch}
    report=dict(schema_version=1,line=args.line,packet_sha256=hashlib.sha256(raw).hexdigest(),source_before=before,source_after=after,source_unchanged=before==after,results=results,scope='Actual JS gate and Python rc-verify admission route; prior packed measurements and simulated envelope; no complete coordinator or seal execution')
    with args.out.open('x') as f:json.dump(report,f,indent=2);f.write('\n')
    if before!=after:raise RuntimeError('caller source changed')
    if any(r['exit_code'] for r in results):raise RuntimeError('isolation controls failed; see '+str(args.out))
print(json.dumps(dict(ok=True,line=args.line,report=str(args.out))))
