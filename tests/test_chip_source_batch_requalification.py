# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact source-only native refresh and combined live modern-source admission."""
import copy
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest
import tests.audit_test_context as context
from tests.chip_batch_history import batch_recorded_stage_subject

ROOT=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()

def raw_rows(text):
    marker='\n  "entries": [';assert text.count(marker)==1
    pos=text.index(marker)+len(marker);decoder=json.JSONDecoder();rows=[]
    while True:
        while text[pos].isspace() or text[pos]==',':pos+=1
        if text[pos]==']':return rows
        row,end=decoder.raw_decode(text,pos);rows.append((row,text[pos:end]));pos=end

class ChipSourceBatchRequalification(unittest.TestCase):
    def test_combined_live_source_guards_and_all_native_no_coordinator_refusals(self):
        command=['node','tests/chip_source_batch_requalification_probe.mjs']
        if os.environ.get('NGX_CHIP_SOURCE_BATCH_DIAGNOSTIC'):command.append(os.environ['NGX_CHIP_SOURCE_BATCH_DIAGNOSTIC'])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=120)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-10000:]);report=json.loads(result.stdout)
        self.assertEqual(report['native_requirements'],31 if report['line']=='main' else 30);self.assertEqual(report['refreshed_native_profiles'],25 if report['line']=='main' else 24)
        self.assertEqual(report['stale_native_bindings'],0);self.assertTrue(report['all_current_native_guards_refuse_missing_coordinator'])
        self.assertEqual(report['real_source_subjects'],12);self.assertEqual(report['controls'],28);self.assertEqual(report['actual_checker_controls'],2)
        roles=report['existing_role_evidence'];self.assertEqual(roles,{'frozen_reviewed':1446,'current_reviewed':178,'frozen_open':290,'current_open':130,'insufficient':0,'unchanged_authored_review_documents':79})
        self.assertEqual(report['product_reference_fixture_members_preserved'],1625);self.assertEqual(report['upstream_import_bindings'],26);self.assertEqual(report['owned_replacement_roles'],1)
        self.assertFalse(report['actual_native_packed_or_floor_qualified']);self.assertTrue(report['combined_historical_union_pending'])

    def test_exact_native_source_binding_transition_preserves_every_other_byte(self):
        task=json.loads((ROOT/'compatibility/rc/chip-source-batch-worksheet.json').read_bytes());stored=(ROOT/task['prior']['path']).read_bytes();self.assertEqual(sha(stored),task['prior']['sha256'])
        raw=gzip.decompress(stored);self.assertEqual(sha(raw),task['prior']['raw_sha256']);prior=json.loads(raw);out=json.loads((ROOT/'compatibility/rc/chip-source-batch-outputs.json').read_bytes())
        self.assertEqual(subprocess.check_output(['git','--no-replace-objects','show',prior['source_parent']+':'+prior['ledger_path']],cwd=ROOT),prior['ledger_text'].encode())
        current=(ROOT/prior['ledger_path']).read_bytes();self.assertEqual(sha(current),out['expected_ledger_sha256']);old=raw_rows(prior['ledger_text']);new=raw_rows(current.decode());self.assertEqual(len(new),1697)
        changed={r['sha']:r for r in out['refreshed_native_profiles']};self.assertEqual(set(changed),set(out['updated_entry_shas']));self.assertEqual(len(changed),task['expected_stale_native_profiles']);same=[];shared=set()
        for (previous,a),(actual,b) in zip(old,new):
            self.assertEqual(previous['sha'],actual['sha']);self.assertEqual(previous['final_disposition'],actual['final_disposition'])
            if actual['sha'] not in changed:self.assertEqual(b,a);same.append(b);continue
            ref=changed[actual['sha']];expected=copy.deepcopy(previous);expected['individual_proof'][ref['field']]['source_members']=actual['individual_proof'][ref['field']]['source_members'];expected['evidence_report']=ref['path']
            bodybytes=(ROOT/ref['path']).read_bytes();self.assertEqual(sha(bodybytes),ref['sha256'])
            if previous.get('source_check',{}).get('evidence_report_sha256'):expected['source_check']['evidence_report_sha256']=sha(bodybytes)
            self.assertEqual(actual,expected);self.assertNotEqual(actual['individual_proof'][ref['field']]['source_members'],previous['individual_proof'][ref['field']]['source_members'])
            body,review=context.read_review(ROOT,actual);oldbody,oldreview=context.read_review(ROOT,previous)
            context.assert_native_review(self,ROOT,actual)
            expectedbody=copy.deepcopy(oldbody)
            if ref['multirow']:
                self.assertNotIn('individual_proof',body);self.assertEqual(len(body['reviews']),3);shared.add(ref['path'])
                for row in expectedbody['reviews']:
                    currentrow=next(r for r in body['reviews'] if r['sha']==row['sha']);row['individual_proof']=currentrow['individual_proof'];row['recorded_source_context']=currentrow['recorded_source_context']
            else:expectedbody['individual_proof']=actual['individual_proof'];expectedbody['recorded_source_context']=review['recorded_source_context']
            self.assertEqual(body,expectedbody);record=review['recorded_source_context'];self.assertEqual(record['inputs'],out['inputs']);self.assertEqual(record['prior_review'],{'path':previous['evidence_report'],'sha256':sha((ROOT/previous['evidence_report']).read_bytes())})
            self.assertEqual(record['prior_entry'],{'ledger_path':prior['ledger_path'],'ledger_commit':prior['source_parent'],'entry_sha256':sha((json.dumps(previous,indent=2,ensure_ascii=False)+'\n').encode())})
            self.assertTrue(record['source_scope_only']);self.assertFalse(record['actual_native_packed_or_floor_qualified'])
        self.assertEqual(len(shared),1);self.assertEqual(len(same),1697-len(changed));self.assertEqual(sha('\0'.join(same).encode()),out['unrelated_entry_bytes_sha256'])
        restored=current.decode()
        for (previous,a),(actual,b) in zip(old,new):
            if actual['sha'] in changed:self.assertEqual(restored.count(b),1);restored=restored.replace(b,a,1)
        self.assertEqual(restored,prior['ledger_text'])
        for member in prior['reviews']+prior['authored_stores']+prior['authored_reviews']:self.assertEqual((ROOT/member['path']).read_bytes(),member['text'].encode())
        for member in prior['sources']:self.assertEqual(batch_recorded_stage_subject(ROOT,'chip-source-batch-requalification',member['path']),member['text'].encode())
        for group in ['projects','testing','reference','fixtures']:self.assertEqual(subprocess.check_output(['git','--no-replace-objects','diff',task['source_parent'],'--',group],cwd=ROOT),b'')
