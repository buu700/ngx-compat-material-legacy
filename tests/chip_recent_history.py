# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Receipts for complete original source-test modules; never live admission.

Each module executes once per process. Repeated outer cases reference that
same execution and its before/after current coherence checks. Changed inputs,
preimages or HEAD cannot reuse that receipt. Current source qualification is
the independent raw source87/native guard, not a historical test result.
"""
import gzip
import hashlib
import json
import os
import subprocess
from functools import lru_cache
from pathlib import Path
INPUT='compatibility/rc/chip-recent-history-inputs.json'
PINS={'main':'0bec81d070453c3224e8b06577c49658d53dbb570a48a81bce4d238fedf4d5d9',
      '21.x':'66c698888d08f80322a5c939e05cbabb39c1afbbb6c36f99287edc32f7aee46c'}
_sha=lambda b:hashlib.sha256(b).hexdigest()

@lru_cache(maxsize=7)
def _execute(root,stage,inputs_hash,prior_hash,head,report_dir):
    command=['node','scripts/run-chip-recent-history.mjs',stage]
    if report_dir:command.extend(['--report',str(Path(report_dir)/(stage+'.json'))])
    result=subprocess.run(command,cwd=root,
                          capture_output=True,text=True,timeout=210)
    if result.returncode:raise AssertionError((result.stdout+result.stderr)[-15000:])
    # Keep the cached value immutable; callers never receive the cached object.
    return result.stdout.strip().splitlines()[-1]

def assert_recorded_case(test,root,stage,case_id):
    raw=(root/INPUT).read_bytes();data=json.loads(raw);fingerprint=_sha(raw)
    test.assertEqual(fingerprint,PINS[data['line']])
    stored=(root/data['prior']['path']).read_bytes();test.assertEqual(_sha(stored),data['prior']['sha256'])
    test.assertEqual(_sha(gzip.decompress(stored)),data['prior']['raw_sha256'])
    entries=[e for e in data['entries'] if e['id']==stage];test.assertEqual(len(entries),1)
    test.assertIn(case_id,entries[0]['case_ids'])
    head=subprocess.check_output(['git','--no-replace-objects','rev-parse','HEAD'],cwd=root,text=True).strip()
    result=json.loads(_execute(str(root),stage,fingerprint,_sha(stored),head,
                              os.environ.get('NGX_CHIP_RECENT_HISTORY_REPORT_DIR','')))
    test.assertEqual(result['id'],stage);test.assertEqual(result['line'],data['line'])
    test.assertEqual(result['case_ids'],entries[0]['case_ids'])
    for flag in ['current_guard_passed_before_and_after','original_program_unchanged',
                 'historical_post_execution_clean','temporary_graph_removed']:
        test.assertTrue(result[flag])
    test.assertFalse(result['actual_current_source_native_packed_or_floor_qualified'])
    test.assertEqual(result['g11_claim'],'not-passed')
