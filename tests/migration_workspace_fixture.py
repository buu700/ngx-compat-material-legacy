"""Synthetic admission receipts, never execution evidence."""
import hashlib
import json
from migration_workspace_admission import old_workspace_ids, migrated_template_sources, SUPPORT_FILES
from migration_cli_fixture import cli_identities

def workspace_receipt(root, active, case, invocation):
    line=active.binding['source_line'];plan=json.loads((root/'compatibility/rc/consumer-floor-plan.json').read_text());row=plan['lines'][line]
    artifacts={a['id']:a['sha256'] for a in active.manifest['artifacts'] if a['id'] in ('library','migrate-cli')}
    identities=cli_identities()
    cli=identities.pop(1)
    upgraded=dict(result='pass',line=line,versions=dict(core=row['framework'],cdk=row['cdk'],material=row['material'],rxjs=plan['current_configuration']['rxjs'],typescript=plan['current_configuration']['typescript_by_line'][line],zone='0.16.3' if line=='main' else '0.15.1',tslib='2.8.1'),node='v'+json.loads((root/'toolchain-lock.json').read_text())['repository']['node'],strict_templates=True,skip_lib_check=False,library_sha256=artifacts['library'],cli_sha256=artifacts['migrate-cli'],**{k:'f'*64 for k in ('application_sha256','styles_sha256','css_sha256','lock_sha256')},browser={'browser':'Synthetic Chrome','result':'pass','before':{'ready':True,'error':None,'invalid':True,'button':'Migrated'},'after':{'value':'yes','valid':True,'panelOpen':False}})
    application,styles=migrated_template_sources(root)
    versions=upgraded['versions']
    dependencies={f'@angular/{name}':versions['core'] for name in ('common','compiler','compiler-cli','core','forms','platform-browser','platform-browser-dynamic')}
    dependencies.update({'@angular/cdk':versions['cdk'],'@angular/material':versions['material'],'rxjs':versions['rxjs'],
                         'typescript':versions['typescript'],'tslib':versions['tslib'],'zone.js':versions['zone'],'@ngx-compat/material-legacy':'file:/synthetic/library.tgz'})
    library_version=json.loads((root/'projects/ngx-material-legacy/package.json').read_text())['version']
    bundle_bytes=b'// Synthetic browser bundle, not compiled consumer evidence.\n'
    bundle=dict(module_loader='linked-consumer-browser-iife',format='iife',platform='browser',input_paths_confined=True,
                tool_version=json.loads((root/'package.json').read_text())['devDependencies']['esbuild'],bundle_sha256=hashlib.sha256(bundle_bytes).hexdigest(),
                inputs=[dict(path=p,sha256='a'*64) for p in ('out/main.js','node_modules/@ngx-compat/material-legacy/fesm2022/button.mjs','node_modules/@angular/core/fesm2022/core.mjs','node_modules/rxjs/index.js')])
    values=dict(application=application.encode(),styles=styles.encode(),css=b'.mat-select{} .mat-raised-button{}',bundle=bundle_bytes,
                package=json.dumps({'dependencies':dependencies}).encode(),
                lock=json.dumps({'packages':{'':{'dependencies':dependencies},**{'node_modules/'+name:{'version':library_version if name=='@ngx-compat/material-legacy' else version} for name,version in dependencies.items()}}}).encode(),
                tsconfig=json.dumps({'files':['src/main.ts'],'compilerOptions':{'strict':True,'skipLibCheck':False,'rootDir':'src','types':[]},'angularCompilerOptions':{'strictTemplates':True,'compilationMode':'full'}}).encode(),
                bundle_inputs=json.dumps(bundle).encode())
    directory=active.run_dir/'evidence/migration-packaged'/invocation/'upgraded-consumer';directory.mkdir(parents=True,exist_ok=True)
    support={}
    for name,filename in SUPPORT_FILES.items():
        path=directory/filename;path.write_bytes(values[name]);support[name]=dict(path=path.relative_to(active.run_dir).as_posix(),sha256=hashlib.sha256(values[name]).hexdigest(),bytes=len(values[name]))
    upgraded.update(support=support,bundle=bundle,animation_engine={'installed_packages':[],'lock_packages':[]})
    for name,field in [('application','application_sha256'),('styles','styles_sha256'),('css','css_sha256'),('lock','lock_sha256')]:upgraded[field]=support[name]['sha256']
    body=dict(case_id=case,group='old-workspace-cli',check_id='migration-packaged',kind='assertion',result='pass',exit_code=0,line=line,run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,tarball_used=True,material_version='16.2.14',material_manifest_sha256=json.loads((root/'reference/material-16.2.14/PROVENANCE.json').read_text())['isolated_environment']['material_manifest_sha256'],artifacts=artifacts,cli=cli,cli_support=identities,upgraded_consumer=upgraded)
    if case!='old-workspace/upgraded-consumer':
        c=old_workspace_ids(root)[case];body.update(before=c['before'],after=c['expected_after'],changed=True,applied=True)
        body.update({k+'_sha256':hashlib.sha256(body[k].encode()).hexdigest() for k in ('before','after')})
    return body
