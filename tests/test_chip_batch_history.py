# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact source successor, genuine migration stages and strict unknown-byte rejection."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest
from tests.chip_batch_history import (INPUT,batch_history_context,batch_history_read,
    validate_batch_history_current,batch_recorded_stage_subject)
from tests.chip_history_union import validate_chip_history_current
ROOT=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()

class ChipBatchHistory(unittest.TestCase):
    def test_JS_exact_current_source_predecessors_and_stage_controls(self):
        command=['node','tests/chip_batch_history_probe.mjs']
        if os.environ.get('NGX_CHIP_BATCH_HISTORY_DIAGNOSTIC'):command.append(os.environ['NGX_CHIP_BATCH_HISTORY_DIAGNOSTIC'])
        child=subprocess.run(command,cwd=ROOT,text=True,capture_output=True,timeout=90)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-11000:]);report=json.loads(child.stdout)
        self.assertEqual(report['actual_current_subjects'],485 if report['line']=='main' else 474);self.assertEqual(report['authenticated_predecessors'],8)
        self.assertEqual(report['exact_new_stage_subjects'],17);self.assertEqual(report['controls'],43);self.assertEqual(report['unchanged_old_datasets'],7)
        self.assertEqual(report['native_guards'],31 if report['line']=='main' else 30);self.assertTrue(report['all_current_native_guards_refuse_missing_coordinator'])
        self.assertFalse(report['actual_native_packed_or_floor_qualified']);self.assertEqual(report['new_SHA_or_role_decisions'],0)

    def test_Python_unknown_source_stage_and_cache_controls(self):
        read=lambda p:(ROOT/p).read_bytes();data,before,source=validate_batch_history_current(ROOT,read,required=True);history=batch_history_read(ROOT,read)
        self.assertEqual(len(before['mappings']),8);self.assertEqual((ROOT/data['ledger_path']).read_text(),source['ledger_text'])
        for member in before['mappings']:
            self.assertEqual(history(member['path']),member['before_text'].encode());unknown=read(member['path'])+b'unknown batch history source';changed=lambda p:unknown if p==member['path'] else read(p)
            self.assertEqual(batch_history_read(ROOT,changed)(member['path']),unknown)
            with self.subTest(path=member['path']),self.assertRaises(AssertionError):validate_batch_history_current(ROOT,changed,required=True)
            with self.assertRaises(AssertionError):validate_chip_history_current(ROOT,changed,required=True)
        for stage in before['stages']:
            for member in stage['members']:
                self.assertEqual(sha(batch_recorded_stage_subject(ROOT,stage['name'],member['path'])),member['sha256'])
                with self.assertRaises(AssertionError):batch_recorded_stage_subject(ROOT,stage['name'],member['path'],lambda p:read(p)+b'unknown' if p==member['path'] else read(p))
        for stage,path in [('unknown',data['ledger_path']),('chip-edit-admission','tests/audit_test_context.py')]:
            with self.assertRaises(AssertionError):batch_recorded_stage_subject(ROOT,stage,path)
        foreign=before['stages'][1]['members'][0]['text'].encode()
        with self.assertRaises(AssertionError):batch_recorded_stage_subject(ROOT,before['stages'][0]['name'],data['ledger_path'],lambda p:foreign if p==data['ledger_path'] else read(p))
        for path in [INPUT,data['prior']['path'],data['source_prior']['path'],'scripts/chip-batch-history.mjs']:
            corrupt=False
            def changing(p):return b'changed' if corrupt and p==path else read(p)
            captured=batch_history_read(ROOT,changing);corrupt=True
            with self.assertRaises((AssertionError,ValueError,KeyError)):batch_history_context(ROOT,changing)
            self.assertEqual(captured(before['mappings'][0]['path']),before['mappings'][0]['before_text'].encode())
        poisoned=batch_history_context(ROOT,read);poisoned[1]['mappings'][0]['before_text']='changed'
        self.assertEqual(batch_history_context(ROOT,read)[1]['mappings'][0]['before_text'],before['mappings'][0]['before_text'])

    def test_original_source_and_stage_preimages_are_the_actual_committed_bytes(self):
        data,before,source=batch_history_context(ROOT,lambda p:(ROOT/p).read_bytes());git=lambda *a:subprocess.check_output(['git','--no-replace-objects',*a],cwd=ROOT)
        for member in before['mappings']:
            self.assertEqual(git('show',data['predecessor_frame']+':'+member['path']),member['before_text'].encode());self.assertEqual(git('show',data['source_parent']+':'+member['path']),member['parent_text'].encode())
        for stage in before['stages']:
            for member in stage['members']:self.assertEqual(git('show',stage['commit']+':'+member['path']),member['text'].encode())
        for member in before['unchanged_data']:self.assertEqual(sha((ROOT/member['path']).read_bytes()),member['sha256'])
        for member in source['edited_source_preimages']:self.assertEqual(git('show',data['source_parent']+':'+member['path']),member['text'].encode())
