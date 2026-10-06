"""The old-workspace route admits only packed migration plus the upgraded consumer."""
import hashlib
import json
import re

def old_workspace_ids(root):
    catalog=json.loads((root/'fixtures/migration/cases.json').read_text())
    return {c['id']:c for c in catalog['cases'] if isinstance(c.get('expected_after'),str) and c['expected_after']!=c['before'] and c.get('expect_ok') is not False}

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
        if {i['path'] for i in identities}!={'package/package.json','package/bin/migrate-legacy.js','package/lib/ts-rewrite.js','package/lib/sass-rewrite.js','package/LICENSE'} or len(identities)!=5:return False
        if any(not re.fullmatch(r'[0-9a-f]{64}',i['sha256']) or type(i['bytes']) is not int or i['bytes']<1 for i in identities):return False
        upgraded=body['upgraded_consumer']
        if any(upgraded.get(k)!=v for k,v in dict(result='pass',line=line,library_sha256=artifacts['library'],cli_sha256=artifacts['migrate-cli'],strict_templates=True,skip_lib_check=False).items()):return False
        tools=json.loads((root/'toolchain-lock.json').read_text())
        if upgraded['node']!='v'+tools['repository']['node']:return False
        plan=json.loads((root/'compatibility/rc/consumer-floor-plan.json').read_text())
        row=plan['lines'][line]
        expected=dict(core=row['framework'],cdk=row['cdk'],material=row['material'],rxjs=plan['current_configuration']['rxjs'],typescript=plan['current_configuration']['typescript_by_line'][line],zone='0.16.3' if line=='main' else '0.15.1',tslib='2.8.1')
        if upgraded['versions']!=expected:return False
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
    except (KeyError,ValueError,TypeError,OSError):return False
