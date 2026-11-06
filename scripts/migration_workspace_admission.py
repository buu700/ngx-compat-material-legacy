# Copyright Google LLC All Rights Reserved.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.dev/license
# Copyright (c) 2026 Ryan Lester.

"""The old-workspace route admits only packed migration plus the upgraded consumer."""
import hashlib
import gzip
import io
from pathlib import PurePosixPath
import json
import re
import tarfile
import zlib
from rc_acceptance import EvidenceError, assertion_directory, checked_file, contained_file
from consumer_floor_admission import ENGINE_PACKAGE, ENGINE_ENTRY, HEX

SUPPORT_FILES = dict(application='application.ts',styles='styles.scss',css='css.css',package='package.json',
                     lock='lock.json',tsconfig='tsconfig.json',bundle='bundle.js',bundle_inputs='bundle_inputs.json')

def migrated_template_sources(root):
    source=(root/'scripts/migrated-consumer-proof.mjs').read_text()
    application=re.search(r'export const OLD_APPLICATION = `(.*?)`;',source,re.S)
    styles=re.search(r'export const OLD_STYLES = `(.*?)`;',source,re.S)
    if not application or not styles:raise ValueError('missing historical migration templates')
    return (application.group(1).replace('@angular/material/legacy-','@ngx-compat/material-legacy/legacy-'),
            styles.group(1).replace("'@angular/material'","'@ngx-compat/material-legacy'"))

def workspace_support_records(body):
    return list(body['upgraded_consumer']['support'].values()) if body.get('group')=='old-workspace-cli' else []

def migrated_support_ok(root,active,upgraded,invocation,versions):
    support=upgraded['support']
    if not isinstance(support,dict) or set(support)!=set(SUPPORT_FILES):return False
    prefix=assertion_directory('migration-packaged',invocation)+'/upgraded-consumer/'
    contents={}
    for name,filename in SUPPORT_FILES.items():
        record=support[name]
        if record['path']!=prefix+filename:return False
        contents[name]=checked_file(active.run_dir,record,'migrated consumer '+name).read_bytes()
    application,styles=migrated_template_sources(root)
    if contents['application'].decode()!=application or contents['styles'].decode()!=styles:return False
    for name,field in [('application','application_sha256'),('styles','styles_sha256'),('css','css_sha256'),('lock','lock_sha256')]:
        if upgraded[field]!=support[name]['sha256']:return False
    css=contents['css'].decode()
    if '.mat-select' not in css or '.mat-raised-button' not in css:return False
    config=json.loads(contents['tsconfig']);compiler=config['compilerOptions'];angular=config['angularCompilerOptions']
    if (compiler.get('strict') is not True or compiler.get('skipLibCheck') is not False or compiler.get('paths')
        or compiler.get('rootDir')!='src' or compiler.get('types')!=[] or config.get('files')!=['src/main.ts']
        or angular.get('strictTemplates') is not True or angular.get('compilationMode')!='full'):return False
    package=json.loads(contents['package']);dependencies=package['dependencies']
    expected={f'@angular/{name}':versions['core'] for name in ('common','compiler','compiler-cli','core','forms','platform-browser','platform-browser-dynamic')}
    expected.update({'@angular/cdk':versions['cdk'],'@angular/material':versions['material'],
                     'rxjs':versions['rxjs'],'typescript':versions['typescript'],'tslib':versions['tslib'],'zone.js':versions['zone']})
    if set(dependencies)!=set(expected)|{'@ngx-compat/material-legacy'} or any(dependencies[k]!=v for k,v in expected.items()):return False
    if not dependencies['@ngx-compat/material-legacy'].startswith('file:'):return False
    lock=json.loads(contents['lock']);packages=lock['packages']
    if packages['']['dependencies']!=dependencies or any(ENGINE_PACKAGE.search(path) for path in packages):return False
    if any(packages['node_modules/'+name]['version']!=version for name,version in expected.items()):return False
    library_version=json.loads((root/'projects/ngx-material-legacy/package.json').read_text())['version']
    if packages['node_modules/@ngx-compat/material-legacy']['version']!=library_version:return False
    if upgraded.get('animation_engine')!={'installed_packages':[],'lock_packages':[]}:return False
    bundle=json.loads(contents['bundle_inputs'])
    if bundle!=upgraded['bundle'] or bundle.get('bundle_sha256')!=support['bundle']['sha256']:return False
    if any(bundle.get(k)!=v for k,v in dict(module_loader='linked-consumer-browser-iife',format='iife',platform='browser',input_paths_confined=True).items()):return False
    if bundle.get('tool_version')!=json.loads((root/'package.json').read_text())['devDependencies']['esbuild']:return False
    inputs=bundle['inputs'];paths=[item['path'] for item in inputs]
    if not inputs or len(paths)!=len(set(paths)) or any(not HEX.fullmatch(item['sha256']) for item in inputs):return False
    if any(path.startswith('/') or '\\' in path or any(part in ('','.','..') for part in path.split('/')) for path in paths):return False
    if any(ENGINE_PACKAGE.search(path) or ENGINE_ENTRY.search(path) for path in paths):return False
    if 'out/main.js' not in paths or not all(any(path.startswith(prefix) for path in paths) for prefix in ('node_modules/@ngx-compat/material-legacy/','node_modules/@angular/core/','node_modules/rxjs/')):return False
    return True

def old_workspace_ids(root):
    catalog=json.loads((root/'fixtures/migration/cases.json').read_text())
    return {c['id']:c for c in catalog['cases'] if isinstance(c.get('expected_after'),str) and c['expected_after']!=c['before'] and c.get('expect_ok') is not False}

CLI_FILES=['package/package.json','package/bin/migrate-legacy.js','package/lib/ts-rewrite.js',
           'package/lib/sass-rewrite.js','package/lib/transaction-write.js','package/LICENSE']

def cli_archive_identities(active, artifact):
    # Match safe-package-extract's CLI bounds and validate the authenticated bytes,
    # including all members, before reading any selected file.
    max_files=1000; max_bytes=10*1024*1024; raw_limit=max_bytes+max_files*1024
    path=contained_file(active.run_dir,artifact['path'])
    if path.stat().st_size > raw_limit: raise ValueError('oversized archive')
    with path.open('rb') as stream: data=stream.read(raw_limit+1)
    if len(data)>raw_limit or len(data)!=artifact['bytes'] or hashlib.sha256(data).hexdigest()!=artifact['sha256']:raise ValueError('artifact identity')
    with gzip.GzipFile(fileobj=io.BytesIO(data)) as stream: raw=stream.read(raw_limit+1)
    if len(raw)>raw_limit:raise ValueError('oversized decompressed archive')
    with tarfile.open(fileobj=io.BytesIO(raw),mode='r:') as archive:
        members=archive.getmembers();seen=set();total=0;selected={}
        if not members or len(members)>max_files:raise ValueError('member count')
        for member in members:
            path=PurePosixPath(member.name); normalized=path.as_posix()
            if (path.is_absolute() or '..' in path.parts or not path.parts or path.parts[0]!='package'
                or chr(92) in member.name or normalized!=member.name.rstrip('/') or normalized in seen
                or not (member.isdir() or member.isfile())):raise ValueError('unsafe member')
            seen.add(normalized);total+=member.size
            if member.size<0 or total>max_bytes:raise ValueError('package size')
            if normalized in CLI_FILES:
                if not member.isfile():raise ValueError('nonregular support file')
                payload=archive.extractfile(member).read()
                if len(payload)!=member.size:raise ValueError('incomplete support file')
                selected[normalized]=dict(path=normalized,bytes=len(payload),sha256=hashlib.sha256(payload).hexdigest())
        if set(selected)!=set(CLI_FILES):raise ValueError('missing support file')
        return [selected[name] for name in CLI_FILES]

def old_workspace_assertion_ok(root,active,body,invocation):
    try:
        fixtures=old_workspace_ids(root)
        case=body['case_id']
        if case not in fixtures and case!='old-workspace/upgraded-consumer':return True
        line=active.binding['source_line']
        if any(body.get(k)!=v for k,v in dict(check_id='migration-packaged',group='old-workspace-cli',kind='assertion',result='pass',exit_code=0,line=line,run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,tarball_used=True,material_version='16.2.14').items()):return False
        artifacts={a['id']:a['sha256'] for a in active.manifest['artifacts'] if a['id'] in ('library','migrate-cli')}
        if len(artifacts)!=2 or body['artifacts']!=artifacts:return False
        provenance=json.loads((root/'reference/material-16.2.14/PROVENANCE.json').read_text())
        if body['material_manifest_sha256']!=provenance['isolated_environment']['material_manifest_sha256']:return False
        identities=[body['cli'],*body['cli_support']]
        if body['cli']['path']!='package/bin/migrate-legacy.js':return False
        if {i['path'] for i in identities}!={'package/package.json','package/bin/migrate-legacy.js','package/lib/ts-rewrite.js','package/lib/sass-rewrite.js','package/lib/transaction-write.js','package/LICENSE'} or len(identities)!=6:return False
        if any(not re.fullmatch(r'[0-9a-f]{64}',i['sha256']) or type(i['bytes']) is not int or i['bytes']<1 for i in identities):return False
        cli_artifact=next(a for a in active.manifest['artifacts'] if a['id']=='migrate-cli')
        expected=cli_archive_identities(active,cli_artifact)
        if {i['path']:(i['sha256'],i['bytes']) for i in identities}!={i['path']:(i['sha256'],i['bytes']) for i in expected}:return False
        upgraded=body['upgraded_consumer']
        if any(upgraded.get(k)!=v for k,v in dict(result='pass',line=line,library_sha256=artifacts['library'],cli_sha256=artifacts['migrate-cli'],strict_templates=True,skip_lib_check=False).items()):return False
        tools=json.loads((root/'toolchain-lock.json').read_text())
        if upgraded['node']!='v'+tools['repository']['node']:return False
        plan=json.loads((root/'compatibility/rc/consumer-floor-plan.json').read_text())
        row=plan['lines'][line]
        expected=dict(core=row['framework'],cdk=row['cdk'],material=row['material'],rxjs=plan['current_configuration']['rxjs'],typescript=plan['current_configuration']['typescript_by_line'][line],zone='0.16.3' if line=='main' else '0.15.1',tslib='2.8.1')
        if upgraded['versions']!=expected:return False
        if not migrated_support_ok(root,active,upgraded,invocation,expected):return False
        if any(not re.fullmatch(r'[0-9a-f]{64}',upgraded[k]) for k in ('application_sha256','styles_sha256','css_sha256','lock_sha256')):return False
        browser=upgraded['browser']
        if browser['result']!='pass' or not browser['browser']:return False
        if browser['before']!={'ready':True,'error':None,'invalid':True,'button':'Migrated'} or browser['after']!={'value':'yes','valid':True,'panelOpen':False}:return False
        if case in fixtures:
            fixture=fixtures[case]
            if body['before']!=fixture['before'] or body['after']!=fixture['expected_after'] or body['changed'] is not True or body['applied'] is not True:return False
            for k in ('before','after'):
                if body[k+'_sha256']!=hashlib.sha256(body[k].encode()).hexdigest():return False
        return True
    except (KeyError,ValueError,TypeError,OSError,EvidenceError,AttributeError,StopIteration,EOFError,tarfile.TarError,zlib.error):return False
