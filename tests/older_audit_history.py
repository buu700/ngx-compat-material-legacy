# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Complete older source-model cohort; all current native guards remain live."""
import gzip,hashlib,json,os,subprocess
from functools import lru_cache
from pathlib import Path
from tests.chip_recent_history import canonical_recorded_case
INPUT='compatibility/rc/older-audit-history-inputs.json'
PINS={'main':'0a1262ad0a7f133f410445561e591b56eed9b7a8c4ea4704aca575a4d67da452',
      '21.x':'be785fb8c6fec9591a59e4fb6bee5f9a0032c560714dfa057e9adf70ff3a6647'}
_sha=lambda b:hashlib.sha256(b).hexdigest()
def _inputs(root):
    raw=(root/INPUT).read_bytes();data=json.loads(raw);assert _sha(raw)==PINS[data['line']]
    stored=(root/data['prior']['path']).read_bytes();assert _sha(stored)==data['prior']['sha256']
    unpacked=gzip.decompress(stored);assert _sha(unpacked)==data['prior']['raw_sha256']
    return data,json.loads(unpacked),_sha(raw),_sha(stored)
def mixed_context_before_history(root):
    data,prior,_,_=_inputs(root);path='tests/test_audit_test_context.py'
    entry=next(e for e in data['entries'] if e['program']==path)
    assert _sha((root/path).read_bytes())==entry['wrapper_sha256'],'unknown mixed audit wrapper'
    previous=next(m for m in prior['preimages'] if m['path']==path)
    assert _sha(previous['text'].encode())==previous['sha256']
    return previous['text']
def validate_complete_older_receipt(data,result):
    assert result['line']==data['line'] and result['id']==data['id']
    assert result['complete_registered_module_set'] is True,'diagnostic subset cannot satisfy the full source cohort'
    assert result['selected_modules']==[e['module'] for e in data['entries']]
    assert result['case_ids']==data['case_ids']
    for flag in ['current_guard_passed_before_and_after','original_program_unchanged','historical_post_execution_clean','temporary_graph_removed']:
        assert result[flag] is True
    assert result['actual_current_source_native_packed_or_floor_qualified'] is False
    assert result['g11_claim']=='not-passed'
@lru_cache(maxsize=2)
def _execute(root,inputs_hash,prior_hash,head,report_dir):
    command=['node','scripts/run-older-audit-history.mjs']
    if report_dir:command.extend(['--report',str(Path(report_dir)/'older-audit-models.json')])
    child=subprocess.run(command,cwd=root,capture_output=True,text=True,timeout=690)
    if child.returncode:raise AssertionError((child.stdout+child.stderr)[-15000:])
    return child.stdout.strip().splitlines()[-1]
def assert_recorded_older_case(test,root,module,case_id):
    data,_,fingerprint,prior_hash=_inputs(root);entries=[e for e in data['entries'] if e['module']==module]
    test.assertEqual(len(entries),1);entry=entries[0];test.assertEqual(_sha((root/entry['program']).read_bytes()),entry['wrapper_sha256'])
    canonical=canonical_recorded_case(entry,case_id);test.assertIn(canonical,data['case_ids'])
    head=subprocess.check_output(['git','--no-replace-objects','rev-parse','HEAD'],cwd=root,text=True).strip()
    result=json.loads(_execute(str(root),fingerprint,prior_hash,head,os.environ.get('NGX_OLDER_AUDIT_HISTORY_REPORT_DIR','')))
    validate_complete_older_receipt(data,result)
