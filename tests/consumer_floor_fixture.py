"""Synthetic execution receipts for admission tests; never product proof."""
import hashlib
import json
from pathlib import Path
from consumer_floor_admission import reviewed_configurations, floor_probe_ids

def write_floor_receipt(root, active, case, invocation):
    plan=json.loads((root/'compatibility/rc/consumer-floor-plan.json').read_text())
    config=reviewed_configurations(plan, active.binding['source_line'])[case]
    directory=active.run_dir/'evidence/consumer-floors'/invocation
    directory.mkdir(parents=True,exist_ok=True)
    runtime={'version':'v'+config['node'],'archive_sha256':plan['node_sources'][config['node']]['sha256'], 'executable_sha256':'b'*64,'executable':'/tmp/qualified/node'}
    body=dict(kind='assertion',check_id='consumer-floors',case_id=case,group=config['group'],line=active.binding['source_line'],run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,configuration=config,result='pass',exit_code=0,runtime=runtime,command=[runtime['executable'],'probe'],artifacts={a['id']:a['sha256'] for a in active.manifest['artifacts'] if a['id'] in ('library','migrate-cli')})
    def record(name,data):
        path=directory/name; path.write_text(json.dumps(data))
        return dict(path=path.relative_to(active.run_dir).as_posix(),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),bytes=path.stat().st_size)
    if config['group']=='library-runtime':
        versions={f'@angular/{name}':config['cdk'] if name=='cdk' else config['material'] if name=='material' else config['framework'] for name in ('animations','cdk','common','compiler','compiler-cli','core','forms','material','platform-browser','platform-browser-dynamic')}
        versions.update(rxjs=config['rxjs'],typescript=config['typescript'])
        body['installed_versions']=versions
        body['consumer_lock']=record(case.replace('/','__')+'.lock.json',{'packages':{'node_modules/'+k:{'version':v} for k,v in versions.items()}})
        detail=dict(status='ok', errors=[],floor_configuration=config,node_runtime={'version':runtime['version'],'exec_path':runtime['executable']},installed_floor_versions=versions,tarball={'sha256':body['artifacts']['library']},aot={'status':'ok'},harness={'status':'ok','bundle':{'module_loader':'bundled-consumer-node-cjs','preserve_explicit_imports':True,'input_paths_confined':True,'tool_version':json.loads((root/'package.json').read_text())['devDependencies']['esbuild'],'format':'cjs','platform':'node','inputs':[{'path':p,'sha256':'f'*64} for p in ['out-tsc/harness-runtime.js','node_modules/rxjs/index.js','node_modules/@ngx-compat/material-legacy/fesm2022/testing.mjs']],'bundle_sha256':'a'*64}},acceptanceCases=[{'case_id':case_id,'result':'pass'} for case_id in floor_probe_ids(root)],isolation={'declaration_program_ok':True,'declaration_check':'skipLibCheck:false'},consumer_lock=body['consumer_lock'])
        body['consumer_detail']=record(case.replace('/','__')+'.detail.json',detail)
    else:
        files={k:'c'*64 for k in ('bin/migrate-legacy.js','lib/ts-rewrite.js','lib/sass-rewrite.js','package.json')}
        body['cli']=dict(support_files=files,cli_bin_sha256=files['bin/migrate-legacy.js'],dry_run={'mode':'dry-run','safe_edits':1,'blocking':0},apply={'applied':1,'blocking':0},second_apply={'applied':0,'blocking':0})
    return body
