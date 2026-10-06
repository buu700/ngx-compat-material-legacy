"""Synthetic admission receipts, never execution evidence."""
import hashlib
import json
from migration_workspace_admission import old_workspace_ids

def workspace_receipt(root, active, case, invocation):
    line=active.binding['source_line'];plan=json.loads((root/'compatibility/rc/consumer-floor-plan.json').read_text());row=plan['lines'][line]
    artifacts={a['id']:a['sha256'] for a in active.manifest['artifacts'] if a['id'] in ('library','migrate-cli')}
    files=['package/package.json','package/bin/migrate-legacy.js','package/lib/ts-rewrite.js','package/lib/sass-rewrite.js','package/LICENSE']
    identities=[{'path':p,'sha256':'c'*64,'bytes':100} for p in files]
    cli=identities.pop(1)
    upgraded=dict(result='pass',line=line,versions=dict(core=row['framework'],cdk=row['cdk'],material=row['material'],rxjs=plan['current_configuration']['rxjs'],typescript=plan['current_configuration']['typescript_by_line'][line],zone='0.16.3' if line=='main' else '0.15.1',tslib='2.8.1'),node='v'+json.loads((root/'toolchain-lock.json').read_text())['repository']['node'],strict_templates=True,skip_lib_check=False,library_sha256=artifacts['library'],cli_sha256=artifacts['migrate-cli'],**{k:'f'*64 for k in ('application_sha256','styles_sha256','css_sha256','lock_sha256')},browser={'browser':'Synthetic Chrome','result':'pass','before':{'ready':True,'error':None,'invalid':True,'button':'Migrated'},'after':{'value':'yes','valid':True,'panelOpen':False}})
    body=dict(case_id=case,group='old-workspace-cli',check_id='migration-packaged',kind='assertion',result='pass',exit_code=0,line=line,run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,tarball_used=True,material_version='16.2.14',material_manifest_sha256=json.loads((root/'reference/material-16.2.14/PROVENANCE.json').read_text())['isolated_environment']['material_manifest_sha256'],artifacts=artifacts,cli=cli,cli_support=identities,upgraded_consumer=upgraded)
    if case!='old-workspace/upgraded-consumer':
        c=old_workspace_ids(root)[case];body.update(before=c['before'],after=c['expected_after'],changed=True,applied=True)
        body.update({k+'_sha256':hashlib.sha256(body[k].encode()).hexdigest() for k in ('before','after')})
    return body
