# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact role receipt/snapshot delta preserves every unresolved obligation."""
import copy,gzip,hashlib,json,os,subprocess,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()
def rows(text):
    dec=json.JSONDecoder();i=text.index('[',text.index('"symbol_uses"'))+1;out=[]
    while True:
        while text[i].isspace() or text[i]==',':i+=1
        if text[i]==']':return out
        row,end=dec.raw_decode(text,i);out.append((row,text[i:end]));i=end
class ChipFocusRoleRequalification(unittest.TestCase):
    def test_role_identity_actual_admission_and_rejection_controls(self):
        cmd=['node','tests/chip_focus_role_requalification_probe.mjs']
        if os.environ.get('NGX_CHIP_FOCUS_ROLE_DIAGNOSTIC'):cmd.append(os.environ['NGX_CHIP_FOCUS_ROLE_DIAGNOSTIC'])
        c=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,timeout=60);self.assertEqual(c.returncode,0,(c.stdout+c.stderr)[-10000:]);r=json.loads(c.stdout)
        self.assertEqual(r['closed_role_receipts_requalified'],21);self.assertEqual(r['all_chip_role_shapes_preserved'],24);self.assertEqual(r['open_chip_roles_preserved'],3);self.assertEqual(r['controls'],13)
        self.assertEqual((r['frozen_reviewed'],r['frozen_insufficient'],r['frozen_open']),(1446,0,290));self.assertEqual((r['current_reviewed'],r['current_insufficient'],r['current_open']),(178,0,130));self.assertTrue(r['current_source_snapshot_valid']);self.assertFalse(r['current_ready']);self.assertEqual(r['additional_uses'],308);self.assertEqual(r['new_semantic_closures'],0);self.assertFalse(r['actual_native_browser_or_floor_execution'])
    def test_only21_receipts_and_snapshot_metadata_change(self):
        t=json.loads((ROOT/'compatibility/rc/chip-focus-role-requalification-worksheet.json').read_bytes());ref=t['prior'];stored=(ROOT/ref['path']).read_bytes();self.assertEqual(sha(stored),ref['sha256']);raw=gzip.decompress(stored);self.assertEqual(sha(raw),ref['raw_sha256']);p=json.loads(raw)
        old=rows(p['stores'][0]['text']);current=(ROOT/p['stores'][0]['path']).read_text();new=rows(current);self.assertEqual(len(new),1736);restored=current;changed=0
        for (a,x),(b,y) in zip(old,new):
            self.assertEqual([a[k] for k in ['file','module','symbol','disposition','status']],[b[k] for k in ['file','module','symbol','disposition','status']])
            if a['file']=='legacy-chips/chip.ts' and a['disposition']=='closed':
                expected=copy.deepcopy(a);expected['source_review']=b['source_review'];self.assertEqual(expected,b);self.assertNotEqual(x,y);changed+=1;restored=restored.replace(y,x,1)
            else:self.assertEqual(x,y)
        self.assertEqual(changed,21);self.assertEqual(restored,p['stores'][0]['text'])
        previous=json.loads(p['stores'][1]['text']);now=json.loads((ROOT/p['stores'][1]['path']).read_bytes());expected=copy.deepcopy(previous);expected['current_source_population_sha256']=now['current_source_population_sha256'];expected['source_snapshot_history']=now['source_snapshot_history'];self.assertEqual(now,expected);self.assertEqual(now['source_snapshot_history'][:-1],previous['source_snapshot_history'])
        self.assertEqual([s for _,s in rows(p['stores'][1]['text'])],[s for _,s in rows((ROOT/p['stores'][1]['path']).read_text())]);self.assertEqual(len(now['symbol_uses']),308)
        for m in p['reviews']:self.assertEqual((ROOT/m['path']).read_bytes(),m['text'].encode())
        for m in p['independent_evidence']+p['product_members']:self.assertEqual(sha((ROOT/m['path']).read_bytes()),m['sha256'])
        for path in ['compatibility/f10/disposition-ledger/ledger.json','projects','testing','reference','fixtures']:
            self.assertEqual(subprocess.check_output(['git','--no-replace-objects','diff','--name-only',p['source_parent'],'--',path],cwd=ROOT),b'')
    def test_full_CLI_still_refuses_runtime_and_remaining_source_gaps(self):
        r=json.loads((ROOT/'compatibility/rc/chip-focus-role-requalification-cli-after.json').read_bytes());before=json.loads((ROOT/'compatibility/rc/chip-focus-native-requalification-cli-after.json').read_bytes())
        self.assertEqual(r['authored_use_review_evidence']['reviewed'],1446);self.assertEqual(r['authored_use_review_evidence']['insufficient'],0);self.assertTrue(r['current_authored_use_inventory']['source_snapshot_valid']);self.assertEqual(r['current_authored_use_inventory']['additional_uses'],308);self.assertFalse(r['current_authored_use_inventory']['ready']);self.assertEqual(r['evidence_failures'],before['evidence_failures']);self.assertEqual(r['disposition_admission'],'incomplete');self.assertEqual(r['g11_claim'],'not-passed')
        self.assertEqual(r['artifact_behavior_evidence'],before['artifact_behavior_evidence'])
if __name__=='__main__':unittest.main()
