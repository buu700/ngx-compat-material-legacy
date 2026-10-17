# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current mandatory chip-input-api source scopes and exact real three-row migration."""
import copy
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest
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


class ChipInputApiAdmission(unittest.TestCase):
    def test_real_mandatory_guard_and_checker_reject_rebound_tampered_source_proofs(self):
        command=['node','tests/chip_input_api_admission_probe.mjs']
        if os.environ.get('NGX_CHIP_INPUT_API_ADMISSION_DIAGNOSTIC'):command.append(os.environ['NGX_CHIP_INPUT_API_ADMISSION_DIAGNOSTIC'])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=120)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-10000:])
        report=json.loads(result.stdout.strip().splitlines()[-1]);self.assertEqual(report['real_source_subjects'],3)
        self.assertEqual(report['semantic_doc_and_entry_controls'],38);self.assertEqual(report['original_integrity_controls'],5+report['prior_review_files_preserved'])
        self.assertEqual(report['current_source_controls'],3);self.assertEqual(report['actual_checker_controls'],5)
        self.assertTrue(report['all_overall_admissions_incomplete']);self.assertFalse(report['actual_native_packed_or_floor_qualified'])

    def test_exact_real_three_rows_keep_1694_other_raw_entries_and_all_prior_reviews(self):
        task=json.loads((ROOT/'compatibility/rc/chip-input-api-admission-worksheet.json').read_bytes());ref=task['prior'];stored=(ROOT/ref['path']).read_bytes();self.assertEqual(sha(stored),ref['sha256'])
        raw=gzip.decompress(stored);self.assertEqual(sha(raw),ref['raw_sha256']);prior=json.loads(raw)
        for commit in [task['source_parent'],prior['source_parent']]:
            before=subprocess.check_output(['git','--no-replace-objects','show',commit+':'+prior['ledger_path']],cwd=ROOT)
            self.assertEqual(before,prior['ledger_text'].encode())
        current=batch_recorded_stage_subject(ROOT,'chip-input-api-admission',prior['ledger_path']);migration=json.loads((ROOT/'compatibility/rc/chip-input-api-admission-entry-migration.json').read_bytes())
        self.assertEqual(sha(current),migration['expected_ledger_sha256']);self.assertEqual(migration['prior'],ref)
        self.assertEqual(migration['foundation_parent'],task['source_parent'])
        old=raw_rows(before.decode());new=raw_rows(current.decode());self.assertEqual(len(new),1697);self.assertEqual([r['sha'] for r,_ in old],[r['sha'] for r,_ in new])
        old_envelope=json.loads(before);new_envelope=json.loads(current);old_envelope.pop('entries');new_envelope.pop('entries');self.assertEqual(new_envelope,old_envelope)
        bodyref=migration['current_review'];bodybytes=(ROOT/bodyref['path']).read_bytes();self.assertEqual(sha(bodybytes),bodyref['sha256']);body=json.loads(bodybytes)
        selected=set(task['subjects']);unchanged=[];oldlabels=[]
        for (previous,a),(actual,b) in zip(old,new):
            if actual['sha'] not in selected:self.assertEqual(b,a);unchanged.append(b);continue
            oldlabels.append(previous['final_disposition']);row=next(r for r in body['reviews'] if r['sha']==actual['sha'])
            expected=copy.deepcopy(previous)
            for key in ['final_disposition','reason','files','diff_sha256','evidence_report','affected_branches','review_depth','individual_proof','source_check']:expected[key]=actual[key]
            self.assertEqual(actual,expected);self.assertEqual(actual['reason'],row['decision']);self.assertEqual(actual['final_disposition'],row['final_disposition'])
            self.assertEqual(actual['diff_sha256'],row['diff_sha256']);self.assertEqual(row['prior_entry']['ledger_commit'],prior['source_parent'])
            self.assertEqual(row['prior_entry']['entry_sha256'],sha((json.dumps(previous,indent=2,ensure_ascii=False)+'\n').encode()))
            self.assertFalse(row['actual_native_packed_or_floor_qualified'])
        self.assertEqual(oldlabels,['not-applicable','not-applicable','do-not-adopt'] if task['line']=='main' else ['needs-individual-review']*3)
        self.assertEqual(len(unchanged),1694);self.assertEqual(sha('\0'.join(unchanged).encode()),migration['unchanged_entry_bytes_sha256'])
        restored=current.decode()
        for (previous,a),(actual,b) in zip(old,new):
            if actual['sha'] in selected:
                self.assertEqual(restored.count(b),1);restored=restored.replace(b,a,1)
        self.assertEqual(restored.encode(),before)  # Exact envelope and every other byte.
        for m in prior['reviews']+prior['owned_sources']:self.assertEqual((ROOT/m['path']).read_bytes(),m['text'].encode())
        foundation=task['foundation_review'];self.assertEqual(sha((ROOT/foundation['path']).read_bytes()),foundation['sha256'])
        self.assertEqual(subprocess.check_output(['git','--no-replace-objects','diff',task['source_parent'],'--','projects/ngx-material-legacy','reference'],cwd=ROOT),b'')
