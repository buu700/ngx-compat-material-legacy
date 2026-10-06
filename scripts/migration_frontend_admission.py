"""Both packaged frontend routes must bind the exact CLI/library run subjects."""
import hashlib
import json
import re
import tarfile
from pathlib import Path
from migration_workspace_admission import old_workspace_ids

SCHEMATIC_FILES=['package/package.json','package/schematics/package.json','package/schematics/collection.json',
    'package/schematics/migrate-legacy/schema.json','package/schematics/migrate-legacy/index.js',
    'package/schematics/migrate-legacy/ts-rewrite.js','package/schematics/migrate-legacy/sass-rewrite.js']
CLI_FILES=['package/package.json','package/bin/migrate-legacy.js','package/lib/ts-rewrite.js',
    'package/lib/sass-rewrite.js','package/lib/transaction-write.js','package/LICENSE']

def archive_identities(active,artifact,files):
    relative=Path(artifact['path'])
    if relative.is_absolute() or '..' in relative.parts or '\\' in str(relative):raise ValueError('unsafe artifact')
    path=active.run_dir
    for part in relative.parts:
        path=path/part
        if path.is_symlink():raise ValueError('symlink artifact')
    data=path.read_bytes()
    if len(data)!=artifact['bytes'] or hashlib.sha256(data).hexdigest()!=artifact['sha256']:raise ValueError('artifact identity')
    with tarfile.open(path) as t:
        identities=[]
        for name in files:
            member=t.getmember(name)
            if not member.isfile():raise ValueError('nonregular support file')
            data=t.extractfile(member).read()
            identities.append(dict(path=name,sha256=hashlib.sha256(data).hexdigest(),bytes=len(data)))
        return identities

def frontend_assertion_ok(root,active,body,invocation):
    case=str(body.get('case_id',''));group=case.split('/',1)[0]
    if group not in ('frontend-parity','packaged-schematic'):return body.get('group') not in ('frontend-parity','packaged-schematic')
    try:
        fixture_id=case.split('/',1)[1];fixture=old_workspace_ids(root)[fixture_id]
        required=dict(check_id='migration-packaged',group=group,kind='assertion',result='pass',exit_code=0,
            line=active.binding['source_line'],run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,
            fixture_case_id=fixture_id,schematic_host='ng-generate',schematic_collection='@ngx-compat/material-legacy:migrate-legacy',
            schematic_test_runner=False,transform_import=False,g04_claim='not-passed',g05_claim='not-passed',rewritten=True)
        if any(body.get(k)!=v or type(body.get(k))!=type(v) for k,v in required.items()):return False
        artifacts={a['id']:a for a in active.manifest['artifacts'] if a['id'] in ('library','migrate-cli')}
        if set(artifacts)!={'library','migrate-cli'} or body['artifacts']!={id:dict(sha256=a['sha256'],bytes=a['bytes']) for id,a in artifacts.items()}:return False
        if body['library_tarball_sha256']!=artifacts['library']['sha256']:return False
        if body['schematic_support_files']!=archive_identities(active,artifacts['library'],SCHEMATIC_FILES):return False
        if body['before']!=fixture['before'] or body['after']!=fixture['expected_after'] or body['before']==body['after']:return False
        for key in ('before','after'):
            if body[key+'_sha256']!=hashlib.sha256(body[key].encode()).hexdigest():return False
        tools=json.loads((root/'toolchain-lock.json').read_text())
        if body['node_version']!=tools['repository']['node'] or not body['node_binary']:return False
        if group=='frontend-parity':
            return body['outputs_match'] is True and body['cli_after_sha256']==body['schematic_after_sha256']==body['after_sha256'] and body['cli_support_files']==archive_identities(active,artifacts['migrate-cli'],CLI_FILES) and body['cli_bin']=='package/bin/migrate-legacy.js' and body['cli_sha256']==next(i['sha256'] for i in body['cli_support_files'] if i['path']==body['cli_bin'])
        return body['cli_comparison'] is False and body['expectation']=='expected_after' and body['expected_after']==fixture['expected_after'] and body['expected_after_sha256']==body['after_sha256'] and body['matches_expected_after'] is True
    except (KeyError,ValueError,TypeError,OSError,IndexError,StopIteration,tarfile.TarError):return False
