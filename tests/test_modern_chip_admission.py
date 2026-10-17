# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Real finite source admission and exact three-row ledger transition."""
import copy
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest
from tests.chip_history_union import recorded_stage_subject
from tests.chip_history_union import historical_product_diff

ROOT=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()


def raw_rows(text):
    marker='\n  "entries": [';assert text.count(marker)==1
    pos=text.index(marker)+len(marker);decoder=json.JSONDecoder();rows=[]
    while True:
        while text[pos].isspace() or text[pos]==',':pos+=1
        if text[pos]==']':return rows
        row,end=decoder.raw_decode(text,pos);rows.append((row,text[pos:end]));pos=end


class ModernChipAdmission(unittest.TestCase):
    def test_real_guards_and_actual_checker_reject_mutated_and_relabeled_evidence(self):
        command=['node','tests/modern_chip_admission_probe.mjs']
        if os.environ.get('NGX_MODERN_CHIP_ADMISSION_DIAGNOSTIC'):command.append(os.environ['NGX_MODERN_CHIP_ADMISSION_DIAGNOSTIC'])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=120)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-12000:])
        report=json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(report['real_source_subjects'],3);self.assertEqual(report['semantic_doc_and_entry_controls'],26)
        self.assertEqual(report['original_integrity_controls'],2+report['prior_review_files_preserved'])
        self.assertEqual(report['current_source_route_controls'],1);self.assertEqual(report['actual_checker_controls'],5)
        self.assertTrue(report['all_overall_admissions_incomplete']);self.assertFalse(report['actual_native_packed_or_floor_qualified'])

    def test_exact_real_three_row_migration_preserves_every_other_entry_byte(self):
        task=json.loads((ROOT/'compatibility/rc/modern-chip-admission-worksheet.json').read_bytes());ref=task['prior'];stored=(ROOT/ref['path']).read_bytes()
        self.assertEqual(sha(stored),ref['sha256']);raw=gzip.decompress(stored);self.assertEqual(sha(raw),ref['raw_sha256']);prior=json.loads(raw)
        before=subprocess.check_output(['git','--no-replace-objects','show',task['source_parent']+':'+prior['ledger_path']],cwd=ROOT)
        self.assertEqual(before,prior['ledger_text'].encode());self.assertEqual(sha(before),prior['ledger_sha256'])
        current=recorded_stage_subject(ROOT,'modern-chip-admission',prior['ledger_path']);migration=json.loads((ROOT/'compatibility/rc/modern-chip-admission-entry-migration.json').read_bytes())
        self.assertEqual(sha(current),migration['expected_ledger_sha256']);self.assertEqual(migration['prior'],ref)
        old=raw_rows(before.decode());new=raw_rows(current.decode());self.assertEqual(len(new),1697);self.assertEqual([r['sha'] for r,_ in old],[r['sha'] for r,_ in new])
        selected=set(task['subjects']);unrelated=[];oldlabels=[];newlabels=[]
        report=json.loads((ROOT/migration['current_review']['path']).read_bytes());self.assertEqual(sha((ROOT/migration['current_review']['path']).read_bytes()),migration['current_review']['sha256'])
        for (previous,oldtext),(actual,newtext) in zip(old,new):
            if actual['sha'] not in selected:self.assertEqual(newtext,oldtext);unrelated.append(newtext);continue
            oldlabels.append(previous['final_disposition']);newlabels.append(actual['final_disposition']);row=next(r for r in report['reviews'] if r['sha']==actual['sha'])
            expected=copy.deepcopy(previous)
            for key in ['final_disposition','reason','files','evidence_report','affected_branches','review_depth','individual_proof','source_check']:expected[key]=actual[key]
            self.assertEqual(actual,expected);self.assertEqual(actual['reason'],row['decision']);self.assertEqual(actual['final_disposition'],row['final_disposition'])
            self.assertEqual(row['prior_entry']['ledger_commit'],task['source_parent'])
            self.assertEqual(row['prior_entry']['entry_sha256'],sha((json.dumps(previous,indent=2,ensure_ascii=False)+'\n').encode()))
            self.assertFalse(row['actual_native_packed_or_floor_qualified'])
        self.assertEqual(len(unrelated),1694);self.assertEqual(sha('\0'.join(unrelated).encode()),migration['unchanged_entry_bytes_sha256'])
        if task['line']=='main':self.assertEqual(oldlabels,newlabels)
        else:self.assertEqual(oldlabels,['needs-individual-review']*3);self.assertEqual(newlabels,['irrelevant','not-applicable','not-applicable'])
        for oldreview in prior['reviews']:self.assertEqual((ROOT/oldreview['path']).read_bytes(),oldreview['text'].encode())
        self.assertEqual(historical_product_diff(ROOT,task['source_parent']),b'')
