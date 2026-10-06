"""Synthetic source-bound frontend receipts; not product execution evidence."""
import hashlib
import json
from migration_frontend_admission import archive_identities,SCHEMATIC_FILES,CLI_FILES
from migration_workspace_admission import old_workspace_ids

def frontend_receipt(root,active,case,invocation):
    group,fixture_id=case.split('/',1);fixture=old_workspace_ids(root)[fixture_id]
    artifacts={a['id']:a for a in active.manifest['artifacts'] if a['id'] in ('library','migrate-cli')}
    body=dict(case_id=case,fixture_case_id=fixture_id,check_id='migration-packaged',group=group,kind='assertion',result='pass',exit_code=0,line=active.binding['source_line'],run_id=active.manifest['run_id'],invocation_id=invocation,binding=active.binding,
        artifacts={id:dict(sha256=a['sha256'],bytes=a['bytes']) for id,a in artifacts.items()},library_tarball_sha256=artifacts['library']['sha256'],schematic_support_files=archive_identities(active,artifacts['library'],SCHEMATIC_FILES),before=fixture['before'],after=fixture['expected_after'],rewritten=True,schematic_host='ng-generate',schematic_collection='@ngx-compat/material-legacy:migrate-legacy',schematic_test_runner=False,transform_import=False,g04_claim='not-passed',g05_claim='not-passed',node_version=json.loads((root/'toolchain-lock.json').read_text())['repository']['node'],node_binary='/synthetic/node')
    for key in ['before','after']:body[key+'_sha256']=hashlib.sha256(body[key].encode()).hexdigest()
    if group=='frontend-parity':
        support=archive_identities(active,artifacts['migrate-cli'],CLI_FILES);body.update(outputs_match=True,cli_after_sha256=body['after_sha256'],schematic_after_sha256=body['after_sha256'],cli_support_files=support,cli_bin='package/bin/migrate-legacy.js',cli_sha256=next(i['sha256'] for i in support if i['path']=='package/bin/migrate-legacy.js'))
    else:body.update(cli_comparison=False,expectation='expected_after',expected_after=fixture['expected_after'],expected_after_sha256=body['after_sha256'],matches_expected_after=True)
    return body
