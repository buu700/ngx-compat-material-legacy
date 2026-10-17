# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Real historical admission and exact three-row source decision migration."""
import copy
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()


def raw_rows(text):
    marker='\n  "entries": [';assert text.count(marker)==1
    pos=text.index(marker)+len(marker);decoder=json.JSONDecoder();rows=[]
    while True:
        while text[pos].isspace() or text[pos]==',':pos+=1
        if text[pos]==']':return rows
        row,end=decoder.raw_decode(text,pos);rows.append((row,text[pos:end]));pos=end


class ChipListContractAdmission(unittest.TestCase):
    def test_real_validator_writer_and_CLI_require_native_evidence_for_every_label(self):
        command=['node','tests/upstream/chip-list-contract-admission.mjs']
        if os.environ.get('NGX_CHIP_LIST_ADMISSION_DIAGNOSTIC'):command.append(os.environ['NGX_CHIP_LIST_ADMISSION_DIAGNOSTIC'])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=100)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-10000:]);report=json.loads(result.stdout)
        self.assertEqual(report['subjects'],3);self.assertEqual(report['full_historical_roster'],2232)
        self.assertEqual(report['helper_controls'],37);self.assertEqual(report['actual_CLI_controls'],7)
        self.assertFalse(report['actual_native_browser_library_or_floor_execution']);self.assertEqual(report['g11_claim'],'not-passed')

    def test_only_three_reviewed_rows_change_and_prior_review_bytes_are_preserved(self):
        task=json.loads((ROOT/'compatibility/rc/chip-list-contract-worksheet.json').read_bytes());migration=json.loads((ROOT/'compatibility/rc/chip-list-contract-entry-migration.json').read_bytes())
        stored=(ROOT/task['prior']['path']).read_bytes();self.assertEqual(sha(stored),task['prior']['sha256']);prior=json.loads(gzip.decompress(stored))
        original=subprocess.check_output(['git','--no-replace-objects','show',task['source_parent']+':'+prior['ledger_path']],cwd=ROOT);self.assertEqual(original,prior['ledger_text'].encode())
        current=(ROOT/prior['ledger_path']).read_bytes();self.assertEqual(sha(current),migration['expected_ledger_sha256']);old=raw_rows(prior['ledger_text']);new=raw_rows(current.decode());self.assertEqual(len(new),1697)
        self.assertEqual([r['sha'] for r,_ in old],[r['sha'] for r,_ in new]);selected=set(task['subjects']);unchanged=[]
        body=json.loads((ROOT/task['current_review']['path']).read_bytes());self.assertEqual(sha((ROOT/task['current_review']['path']).read_bytes()),task['current_review']['sha256'])
        for (previous,oldtext),(actual,newtext) in zip(old,new):
            if actual['sha'] not in selected:self.assertEqual(newtext,oldtext);unchanged.append(newtext);continue
            expected=copy.deepcopy(previous)
            for key in ['final_disposition','reason','files','evidence_report','affected_branches','review_depth','product_adaptation','individual_proof','source_check']:expected[key]=actual[key]
            self.assertEqual(actual,expected);review=next(r for r in body['reviews'] if r['sha']==actual['sha']);self.assertEqual(actual['individual_proof'],review['individual_proof']);self.assertEqual(review['prior_entry']['entry'],previous)
            self.assertEqual(review['prior_entry']['entry_sha256'],sha((json.dumps(previous,indent=2,ensure_ascii=False)+'\n').encode()));self.assertEqual(review['prior_entry']['ledger_commit'],task['source_parent'])
            self.assertEqual(actual['final_disposition'],review['final_disposition']);self.assertEqual(actual['reason'],review['decision']);self.assertFalse(review['actual_native_packed_or_floor_qualified'])
        self.assertEqual(len(unchanged),1694);self.assertEqual(sha('\0'.join(unchanged).encode()),migration['unchanged_entry_bytes_sha256'])
        self.assertEqual([r['final_disposition'] for r in body['reviews']],['do-not-adopt','do-not-adopt','already-adapted'])
        kept=(ROOT/task['retained_reviews']['path']).read_bytes();self.assertEqual(sha(kept),task['retained_reviews']['sha256'])
        for member in json.loads(gzip.decompress(kept))['members']:
            self.assertEqual(sha((ROOT/member['path']).read_bytes()),member['sha256']);self.assertEqual((ROOT/member['path']).read_text(),member['text'])
