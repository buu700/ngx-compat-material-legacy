# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Construct complete synthetic typeahead records; no product execution occurred."""
import json
import shutil
import subprocess
import tarfile
from pathlib import Path
import rc_acceptance as acceptance
from test_rc_acceptance import write_json

ROOT = Path(__file__).resolve().parents[1]
PEERS = {'fesm2022/_list-key-manager-chunk.mjs':'63042ad0a8264bfedfaac1c03d2b0eee450bcd7890a09792dc83256195e00057', 'fesm2022/_typeahead-chunk.mjs':'c26eed04140a44b175020b75b3a16bf73c2913a064ae61c79dc744d5fa3e4622'}
CHECKERS = ('revalidate-typeahead.mjs','upstream-typeahead-evidence.mjs','typeahead-run-projection.mjs','upstream-packed-run-evidence.mjs','packed-consumer-evidence.mjs','run-typeahead-execution.py')

def prepare(f):
    root=f.root
    f.run['created_at']='synthetic'
    for name in ('projects/ngx-material-legacy','testing/legacy-runner','compatibility/rc/typeahead-fixture','compatibility/rc/typeahead-runner'):
        shutil.copytree(ROOT/name,root/name,dirs_exist_ok=True,symlinks=True)
    for name in CHECKERS:
        shutil.copy2(ROOT/'scripts'/name,root/'scripts'/name)
    exports=root/'compatibility/rc/matrices/library-exports.json'
    exports.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(ROOT/'compatibility/rc/matrices/library-exports.json',exports)
    peer=root/'node_modules/.pnpm/synthetic/node_modules/@angular/cdk'
    shutil.copytree((ROOT/'node_modules/@angular/cdk').resolve(),peer)
    link=root/'node_modules/@angular/cdk'; link.parent.mkdir(parents=True,exist_ok=True)
    link.symlink_to(Path('../.pnpm/synthetic/node_modules/@angular/cdk'),target_is_directory=True)
    real=acceptance.read_json(ROOT/'compatibility/rc/matrices/full-verify.json')
    actual=next(x for x in real['checks'] if x['check_id']=='packed-consumer')
    row=next(x for x in f.matrix['checks'] if x['check_id']=='packed-consumer')
    row['acceptance']['cases_by_line']=actual['acceptance']['cases_by_line']
    write_json(f.matrix_path,f.matrix);f.matrix_sha=acceptance.sha256_file(f.matrix_path)
    f.run['expected_matrix']['sha256']=f.matrix_sha
    artifact=f.run_dir/'library.tgz'
    fixture=f.run_dir/'tar-content/package/fesm2022/a.mjs';fixture.parent.mkdir(parents=True,exist_ok=True);fixture.write_text('export const value=1;')
    with tarfile.open(artifact,'w:gz') as tar:tar.add(fixture.parent.parent,arcname='package')
    library=next(a for a in f.run['artifacts'] if a['id']=='library')
    library.update(bytes=artifact.stat().st_size,sha256=acceptance.sha256_file(artifact))
    for report in f.reports.values():
        if 'library' in report['artifacts']:report['artifacts']['library']={'sha256':library['sha256'],'bytes':library['bytes']}

def snapshot(root, name):
    base=root/name
    return {p.relative_to(base).as_posix():acceptance.sha256_file(p) for p in sorted(base.rglob('*')) if p.is_file() and not p.is_symlink() and 'out' not in p.relative_to(base).parts}

def complete(f):
    root=f.root;run=f.run;library=next(a for a in run['artifacts'] if a['id']=='library'); binding=f.binding
    cid='packed-consumer'; inv=f.invocations[cid]; report=f.reports[cid]
    row=next(x for x in f.matrix['checks'] if x['check_id']==cid); ids=acceptance.expected_cases(row,'main')
    prefix=acceptance.assertion_directory(cid,inv); rel=prefix+'/consumer-observations.json'
    write_json(f.run_dir/rel,{'kind':'packed-consumer-observations','check_id':cid,'run_id':run['run_id'],'invocation_id':inv,'library_sha256':library['sha256'],'cases':[{'case_id':i,'result':'pass'} for i in ids]})
    path=f.run_dir/rel; output={'path':rel,'sha256':acceptance.sha256_file(path),'bytes':path.stat().st_size}
    for key in ('expected_case_ids','discovered_case_ids','executed_case_ids','passed_case_ids'):report[key]=ids
    report.update(passed=len(ids),outputs=[output],case_results=[{'case_id':i,'result':'pass','kind':'assertion','output_paths':[rel]} for i in ids])
    f.save_report(cid)
    cid='typeahead-execution';inv=f.invocations[cid];directory=f.run_dir/acceptance.assertion_directory(cid,inv);directory.mkdir(parents=True,exist_ok=True)
    files={}
    def put(name,value):
        p=directory/name
        if isinstance(value,(dict,list)):write_json(p,value)
        else:p.write_text(value)
        files[name]={'sha256':acceptance.sha256_file(p),'bytes':p.stat().st_size}
    selected=[{'full_name':n,'skipped':False,'success':True} for n in acceptance.TYPEAHEAD_CASES];totals={'executed':496,'passed':9,'failed':0,'skipped':487}
    put('raw-report.json',{'subject_mode':'artifact','mode':'normal','run_id':run['run_id'],'artifact_sha256':library['sha256'],'totals':totals,'failures':[],'specs':selected+[{'full_name':f'other {i}','skipped':True} for i in range(487)]})
    put('commands.json',[{'command':['node',p],'exit_code':0} for p in ('testing/legacy-runner/build.mjs','testing/legacy-runner/build.mjs','node_modules/karma/bin/karma')])
    projection=subprocess.run(['node',str(root/'scripts/typeahead-run-projection.mjs')],input=json.dumps(run),text=True,capture_output=True,check=True).stdout.strip()
    peer=root/'node_modules/.pnpm/synthetic/node_modules/@angular/cdk'
    put('inputs-before.json',{'fixture':snapshot(root,'compatibility/rc/typeahead-fixture'),'runner':snapshot(root,'compatibility/rc/typeahead-runner'),'base_runner':snapshot(root,'testing/legacy-runner'),'project':snapshot(root,'projects/ngx-material-legacy'),'peer':PEERS,'peer_manifest':acceptance.sha256_file(peer/'package.json'),'producer':acceptance.sha256_file(root/'scripts/run-typeahead-execution.py'),'manifest':projection,'artifact':library['sha256']})
    put('entry.generated.ts','synthetic generated entry');put('bundle.js','synthetic bundle')
    source='projects/ngx-material-legacy/package.json';member=f.run_dir/'tar-content/package/fesm2022/a.mjs'
    def graphrow(key,origin,path,p):return {'key':key,'origin':origin,'path':path,'sha256':acceptance.sha256_file(p),'bytes':p.stat().st_size}
    rows=[graphrow('artifact/package/fesm2022/a.mjs','artifact','package/fesm2022/a.mjs',member), graphrow('testing/legacy-runner/out/entry.generated.ts','generated','entry.generated.ts',directory/'entry.generated.ts')]
    for name in PEERS:
        path='.pnpm/synthetic/node_modules/@angular/cdk/'+name
        rows.append(graphrow('node_modules/'+path,'dependency',path,peer/name))
    rows.append(graphrow(source,'source',source,root/source))
    put('metafile.json',{'inputs':{r['key']:{} for r in rows}});put('bundle-inputs.json',{'schema_version':1,'inputs':rows})
    obs={'schema_version':1,'kind':'typeahead-execution','sha':'ff36c80f9c7a14f0e9f36eafc3e1423d34e7c916','line':'main','run_id':run['run_id'],'invocation_id':inv,'binding':binding,'library':{'sha256':library['sha256'],'bytes':library['bytes']},'peer_version':'22.1.7','peer_members':PEERS,'extracted_files':1,'inputs_unchanged':True,'files':files,'selected_cases':selected,'counts':totals}
    write_json(directory/'observation.json',obs)
    names=['observation.json',*files];outputs=[]
    for name in names:
        p=directory/name;outputs.append({'path':p.relative_to(f.run_dir).as_posix(),'sha256':acceptance.sha256_file(p),'bytes':p.stat().st_size})
    report=f.reports[cid];report['outputs']=outputs;report['case_results']=[{'case_id':n,'result':'pass','kind':'assertion','output_paths':[outputs[0]['path']]} for n in acceptance.TYPEAHEAD_CASES];f.save_report(cid)
