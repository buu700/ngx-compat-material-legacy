# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Seven real source rows, mandatory native paths and exact historical subjects."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest
from tests.chip_lifecycle_admission_context import INPUT,admission_context,admission_before_member
ROOT=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()

def raw_rows(text):
    decoder=json.JSONDecoder();i=text.index('[',text.index('"entries"'))+1;rows={}
    while True:
        while text[i].isspace() or text[i]==',':i+=1
        if text[i]==']':return rows
        row,end=decoder.raw_decode(text,i);rows[row['sha']]=text[i:end];i=end

class ChipLifecycleAdmission(unittest.TestCase):
    def test_actual_source_guards_native_writers_and_corruption_controls(self):
        command=['node','tests/chip_lifecycle_admission_probe.mjs']
        if os.environ.get('NGX_CHIP_LIFECYCLE_ADMISSION_DIAGNOSTIC'):command.append(os.environ['NGX_CHIP_LIFECYCLE_ADMISSION_DIAGNOSTIC'])
        child=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=90)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-10000:]);report=json.loads(child.stdout)
        self.assertEqual(report['source_subjects'],7);self.assertEqual(report['whole_original_hunks'],30);self.assertEqual(report['new_native_subjects'],3)
        self.assertEqual(report['full_historical_cases'],2236);self.assertEqual(report['full_browser_cases'],912)
        self.assertEqual(report['source_controls'],56);self.assertEqual(report['native_controls'],93);self.assertEqual(report['historical_boundary_controls'],7)
        self.assertEqual(report['existing_native_scopes_preserved'],7);self.assertTrue(report['actual_historical_and_browser_writers_exercised'])
        self.assertFalse(report['actual_native_browser_library_or_floor_execution'])

    def test_exact_seven_rows_and_no_unrelated_product_or_original_changes(self):
        data,prior=admission_context(ROOT);current=(ROOT/prior['ledger_path']).read_text();before=prior['ledger_text'];a=raw_rows(before);b=raw_rows(current)
        owned={e['sha'] for e in prior['entries']};self.assertEqual(len(a),1697);self.assertEqual(set(a),set(b));self.assertEqual({s for s in a if a[s]!=b[s]},owned)
        self.assertEqual(sum(a[s]==b[s] for s in a),1690)
        old=json.loads(before);live=json.loads(current);self.assertEqual({k:v for k,v in old.items() if k!='entries'},{k:v for k,v in live.items() if k!='entries'})
        review=json.loads((ROOT/'compatibility/rc/chip-lifecycle-admission-source-review.json').read_bytes())
        for row in live['entries']:
            if row['sha'] not in owned:continue
            approved=next(r for r in review['reviews'] if r['sha']==row['sha']);self.assertEqual(row['final_disposition'],approved['final_disposition']);self.assertEqual(row['reason'],approved['decision']);self.assertEqual(row['files'],approved['patch_paths'])
            self.assertEqual(row['diff_sha256'],approved['diff_sha256']);self.assertEqual(row['status'],'reviewed');self.assertEqual(row['g11_claim'],'not-passed')
        for p in ['projects','testing','reference','fixtures']:
            self.assertEqual(subprocess.check_output(['git','--no-replace-objects','diff','--name-only',data['source_parent'],'--',p],cwd=ROOT),b'')
        ref=prior['foundation'];self.assertEqual(sha((ROOT/ref['path']).read_bytes()),ref['sha256'])
        self.assertFalse(review['actual_native_packed_or_floor_qualified']);self.assertFalse(review['candidate_context']['current_product_read_uses_historical_projection'])

    def test_late_corruption_and_unknown_bytes_never_receive_historical_credit(self):
        read=lambda p:(ROOT/p).read_bytes();data,prior=admission_context(ROOT);data['current_members'][0]['sha256']='0'*64;prior['ledger_text']='poisoned'
        clean,snapshot=admission_context(ROOT);self.assertNotEqual(snapshot['ledger_text'],'poisoned')
        for m in clean['current_members']:
            old=snapshot['ledger_text'] if m['path']==snapshot['ledger_path'] else next(s['text'] for s in snapshot['sources'] if s['path']==m['path'])
            self.assertEqual(admission_before_member(ROOT,m['path']),old.encode());unknown=read(m['path'])+b' unreviewed';self.assertEqual(admission_before_member(ROOT,m['path'],lambda p:unknown if p==m['path'] else read(p)),unknown)
        for p in [INPUT,clean['prior']['path']]:
            with self.subTest(corruption=p),self.assertRaises((AssertionError,ValueError)):
                admission_context(ROOT,lambda n:read(n)+b'changed' if n==p else read(n))
        product='projects/ngx-material-legacy/legacy-chips/chip.ts';self.assertEqual(admission_before_member(ROOT,product),read(product))

if __name__=='__main__':unittest.main()
