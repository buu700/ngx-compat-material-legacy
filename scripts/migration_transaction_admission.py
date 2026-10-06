"""Admit source-rostered, artifact-bound CLI filesystem transactions only."""
import hashlib
import json
import re
import tarfile
from pathlib import Path

TRANSACTION_IDS = ['blocked-file-writes-nothing','dry-apply-parity','second-apply-noop',
    'concurrent-edit-rejected','before-write-hook-refuses','write-failure-refused',
    'mid-replacement-failure-restores-originals','recovery-preserves-concurrent-edit',
    'rollback-failure-retains-backup','symlink-target-refused']
SUPPORT_FILES = ['package/package.json','package/bin/migrate-legacy.js','package/lib/ts-rewrite.js',
    'package/lib/sass-rewrite.js','package/lib/transaction-write.js','package/LICENSE']

def transaction_assertion_ok(root, active, body, invocation):
    case = body.get('case_id')
    if case not in TRANSACTION_IDS:
        return body.get('group') != 'transaction-negatives'
    try:
        line = active.binding['source_line']
        expected = dict(check_id='migration-packaged',group='transaction-negatives',kind='assertion',
            result='pass',exit_code=0,line=line,run_id=active.manifest['run_id'],invocation_id=invocation,
            binding=active.binding,cli_bin='package/bin/migrate-legacy.js',transform_import=False,
            fixture_peers_installed=False,coverage='slice',g04_claim='not-passed',g05_claim='not-passed')
        if any(body.get(k)!=v or type(body.get(k))!=type(v) for k,v in expected.items()):return False
        artifacts=[a for a in active.manifest['artifacts'] if a['id'] in ('library','migrate-cli')]
        if len(artifacts)!=2 or {a['id'] for a in artifacts}!={'library','migrate-cli'} or body['artifacts']!=artifacts:return False
        cli=next(a for a in artifacts if a['id']=='migrate-cli')
        relative=Path(cli['path'])
        if relative.is_absolute() or any(p in ('..','.') for p in relative.parts):return False
        path=active.run_dir
        for part in relative.parts:
            path=path/part
            if path.is_symlink():return False
        data=path.read_bytes()
        if len(data)!=cli['bytes'] or hashlib.sha256(data).hexdigest()!=cli['sha256']:return False
        with tarfile.open(path) as archive:
            identities=[]
            for name in SUPPORT_FILES:
                member=archive.getmember(name)
                if not member.isfile():return False
                data=archive.extractfile(member).read()
                identities.append(dict(path=name,bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
        if body['cli_support_files']!=identities:return False
        if case=='blocked-file-writes-nothing':return body['dry_exit']==body['apply_exit']==1 and body['applied']==0 and body['blocking']>0 and body['files_unchanged'] is True and body['dry_apply_records_agree'] is True
        if case=='dry-apply-parity':return body['dry_exit']==body['apply_exit']==0 and body['dry_safe_edits']==body['apply_safe_edits']>0 and all(body[k] is True for k in ['dry_file_unchanged','repeated_dry_run_agrees','rewrote_legacy_import'])
        if case=='second-apply-noop':return body['exit']==body['safe_edits']==0 and body['file_unchanged_from_first_apply'] is True
        if case in ('concurrent-edit-rejected','before-write-hook-refuses'):
            if body['hook']!='MIGRATE_LEGACY_BEFORE_WRITE' or body['production_fault'] is not False or body['exit']!=1:return False
            if case=='concurrent-edit-rejected':return body['applied']==0 and all(body[k] is True for k in ['concurrent_edit','legacy_import_preserved','cli_rewrite_absent'])
            return body['stdout_empty'] is True and body['files_unchanged'] is True and body['file_count']==2
        tx=body['transaction']
        if body['exit']!=1 or not isinstance(tx['error'],str) or not tx['error'] or not tx['failed_path']:return False
        if case in ('write-failure-refused','symlink-target-refused'):
            return body['files_unchanged'] is True and tx['status']=='refused' and tx['applied']==tx['committed_before_failure']==0 and tx['recovery_files']==[] and tx['phase']=='prepare'
        if any(body.get(k) is not v for k,v in dict(hook=None,production_fault=False,injected_fs_error=True,filesystem_path_executed=True).items()):return False
        if body['observed']!={'replacements':3,'rewritten_before_failure':2} or tx['phase']!='replace' or tx['committed_before_failure']!=2:return False
        original=hashlib.sha256(b"import {MatLegacyButtonModule} from '@angular/material/legacy-button';\n").hexdigest()
        if body['original_sha256']!=original:return False
        recovery=body['recovery']
        if len(recovery)!=len(tx['recovery_files']):return False
        for item,reported in zip(recovery,tx['recovery_files']):
            if item['path']!=reported['path'] or item['backup']!=reported['backup'] or item['original_sha256']!=reported['original_sha256'] or item['observed_backup_sha256']!=original or item['original_sha256']!=original or item['bytes']!=71:return False
        if case=='mid-replacement-failure-restores-originals':return tx['status']=='rolled-back' and tx['applied']==0 and tx['rolled_back'] is True and recovery==[] and body['files_restored'] is True and body['retry_exit']==0
        applied=1 if case=='recovery-preserves-concurrent-edit' else 2
        return tx['status']=='recovery-required' and tx['applied']==applied and tx['rolled_back'] is False and len(recovery)==applied and body['files_restored'] is False and body['concurrent_edit_preserved'] is (applied==1) and body['retry_exit'] is None
    except (KeyError,TypeError,ValueError,OSError,tarfile.TarError,StopIteration):return False
