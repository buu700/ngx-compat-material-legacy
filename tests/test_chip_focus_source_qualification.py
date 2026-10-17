# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Current source-only refresh keeps original source subjects and every label."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()

def rows(text):
    i=text.index('[',text.index('"entries"'))+1;decoder=json.JSONDecoder();out=[]
    while True:
        while text[i].isspace() or text[i]==',':i+=1
        if text[i]==']':return out
        value,end=decoder.raw_decode(text,i);out.append((value,text[i:end]));i=end

class ChipFocusSourceQualification(unittest.TestCase):
    def test_current_and_original_scopes_unknown_bytes_and_actual_CLI(self):
        cmd=['node','tests/chip_focus_source_qualification_probe.mjs']
        if os.environ.get('NGX_CHIP_FOCUS_SOURCE_DIAGNOSTIC'):cmd.append(os.environ['NGX_CHIP_FOCUS_SOURCE_DIAGNOSTIC'])
        child=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,timeout=120)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-10000:]);report=json.loads(child.stdout)
        self.assertEqual(report['current_source_subjects'],12);self.assertEqual(report['source_bodies'],4);self.assertEqual(report['selected_original_contexts_preserved'],12)
        self.assertEqual(report['controls'],39);self.assertEqual(report['actual_CLI_controls'],2)
        self.assertEqual(report['product_reference_fixture_members_preserved'],1625);self.assertEqual(report['existing_role_documents_unchanged'],79)
        self.assertTrue(report['all1697_dispositions_preserved']);self.assertEqual(report['new_semantic_closures'],0)
        self.assertFalse(report['actual_native_packed_or_floor_qualified']);self.assertFalse(report['actual_native_browser_or_floor_execution'])

    def test_twelve_binding_refreshes_keep_other1685_rows_and_original_reports(self):
        task=json.loads((ROOT/'compatibility/rc/chip-focus-source-qualification-worksheet.json').read_bytes());ref=task['prior'];stored=(ROOT/ref['path']).read_bytes();self.assertEqual(sha(stored),ref['sha256']);raw=gzip.decompress(stored);self.assertEqual(sha(raw),ref['raw_sha256']);prior=json.loads(raw)
        old=rows(prior['ledger_text']);current=(ROOT/prior['ledger_path']).read_text();new=rows(current);self.assertEqual(len(old),1697);self.assertEqual(len(new),1697)
        selected={e['sha'] for e in prior['entries']};changed=[];restored=current
        for (a,oldbytes),(b,newbytes) in zip(old,new):
            self.assertEqual(a['sha'],b['sha']);self.assertEqual(a['final_disposition'],b['final_disposition']);self.assertEqual(a.get('reason'),b.get('reason'))
            if a['sha'] not in selected:self.assertEqual(oldbytes,newbytes);continue
            changed.append(a['sha']);expected=dict(a)
            for key in ['evidence_report','individual_proof','source_check']:expected[key]=b[key]
            self.assertEqual(b,expected);self.assertNotEqual(oldbytes,newbytes);self.assertEqual(restored.count(newbytes),1);restored=restored.replace(newbytes,oldbytes,1)
        self.assertEqual(set(changed),selected);self.assertEqual(restored,prior['ledger_text'])
        self.assertEqual(subprocess.check_output(['git','--no-replace-objects','show',prior['source_parent']+':'+prior['ledger_path']],cwd=ROOT),prior['ledger_text'].encode())
        for m in prior['reviews']+prior['authored_stores']+prior['authored_reviews']:
            self.assertEqual((ROOT/m['path']).read_bytes(),m['text'].encode())
        for m in prior['product_members']:self.assertEqual(sha((ROOT/m['path']).read_bytes()),m['sha256'],m['path'])
        self.assertEqual(subprocess.check_output(['git','--no-replace-objects','diff','--name-only',prior['source_parent'],'--','projects','testing','reference','fixtures'],cwd=ROOT),b'')
        for p in ['scripts/upstream-historical-behavior-evidence.mjs','scripts/upstream-chip-lifecycle-admission.mjs','scripts/check-upstream-audit-disposition.mjs']:
            self.assertEqual((ROOT/p).read_bytes(),next(m['text'].encode() for m in prior['sources'] if m['path']==p))
        self.assertFalse(task['ready_for_Actions']);self.assertFalse(task['actual_native_packed_or_floor_qualified'])

if __name__=='__main__':unittest.main()
