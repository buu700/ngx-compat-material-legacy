# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Existing native source seals, retained judgments and honest coordinator gap."""
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

def rows(text):
    decoder=json.JSONDecoder();i=text.index('[',text.index('"entries"'))+1;out=[]
    while True:
        while text[i].isspace() or text[i]==',':i+=1
        if text[i]==']':return out
        row,end=decoder.raw_decode(text,i);out.append((row,text[i:end]));i=end

class ChipFocusNativeRequalification(unittest.TestCase):
    def test_all_current_native_guards_and_source_corruptions(self):
        cmd=['node','tests/chip_focus_native_requalification_probe.mjs']
        if os.environ.get('NGX_CHIP_FOCUS_NATIVE_DIAGNOSTIC'):cmd.append(os.environ['NGX_CHIP_FOCUS_NATIVE_DIAGNOSTIC'])
        child=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,timeout=60)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-10000:]);r=json.loads(child.stdout);count=34 if r['line']=='main' else 33
        self.assertEqual(r['native_profiles'],count);self.assertEqual(r['updated_native_profile_shas'],count-3);self.assertEqual(r['new_native_report_count'],count-5)
        self.assertEqual(r['controls'],3*count+7);self.assertEqual(r['all_registry_source_modules_authenticated'],13)
        self.assertTrue(r['all_native_guards_refuse_missing_coordinator']);self.assertEqual(r['stale_native_source_bindings'],0)
        self.assertEqual(r['new_lifecycle_native_subjects_unchanged'],3);self.assertEqual(r['shared_three_row_reports'],1)
        self.assertEqual(r['semantic_native_requirement_changes'],0);self.assertFalse(r['actual_native_packed_or_floor_qualified']);self.assertFalse(r['actual_native_browser_library_or_floor_execution'])

    def test_exact_source_only_transition_preserves_other_rows_and_every_original(self):
        task=json.loads((ROOT/'compatibility/rc/chip-focus-native-requalification-worksheet.json').read_bytes());ref=task['prior'];stored=(ROOT/ref['path']).read_bytes();self.assertEqual(sha(stored),ref['sha256']);unpacked=gzip.decompress(stored);self.assertEqual(sha(unpacked),ref['raw_sha256']);p=json.loads(unpacked)
        old=rows(p['ledger_text']);current=(ROOT/p['ledger_path']).read_text();new=rows(current);self.assertEqual(len(old),1697);self.assertEqual(len(new),1697);selected={r['sha']:r for r in p['native_inventory']['profiles'] if r['stale_members']};restored=current;shared={}
        for (a,before),(b,after) in zip(old,new):
            self.assertEqual(a['sha'],b['sha']);self.assertEqual(a['final_disposition'],b['final_disposition']);self.assertEqual(a.get('reason'),b.get('reason'))
            if a['sha'] not in selected:self.assertEqual(before,after);continue
            profile=selected[a['sha']];field=profile['field'];expected=copy.deepcopy(a);expected['evidence_report']=b['evidence_report'];expected['individual_proof'][field]['source_members']=b['individual_proof'][field]['source_members']
            bodybytes=(ROOT/b['evidence_report']).read_bytes()
            if a.get('source_check',{}).get('evidence_report_sha256'):expected['source_check']['evidence_report_sha256']=sha(bodybytes)
            self.assertEqual(b,expected);self.assertNotEqual(before,after);self.assertEqual(restored.count(after),1);restored=restored.replace(after,before,1)
            original=next(r for r in p['reviews'] if r['path']==a['evidence_report']);oldbody=json.loads(original['text']);body=json.loads(bodybytes);multi=isinstance(body.get('reviews'),list)
            if multi:self.assertNotIn('individual_proof',body);self.assertEqual(len(body['reviews']),3);shared[b['evidence_report']]=True
            currentrow=next(r for r in body['reviews'] if r['sha']==b['sha']) if multi else body;oldrow=next(r for r in oldbody['reviews'] if r['sha']==a['sha']) if multi else oldbody
            self.assertEqual(currentrow['individual_proof'],b['individual_proof']);record=currentrow['recorded_source_context'];self.assertEqual(record['previous_recorded_source_context'],oldrow['recorded_source_context']);self.assertEqual(record['prior_review'],{'path':a['evidence_report'],'sha256':original['sha256']});self.assertTrue(record['source_scope_only']);self.assertFalse(record['actual_native_packed_or_floor_qualified'])
            expectedbody=copy.deepcopy(oldbody)
            for target in expectedbody.get('reviews',[expectedbody]):
                actual=next(r for r in body.get('reviews',[body]) if r['sha']==target['sha']);target['individual_proof']=actual['individual_proof'];target['recorded_source_context']=actual['recorded_source_context']
            self.assertEqual(body,expectedbody)
        self.assertEqual(restored,p['ledger_text']);self.assertEqual(len(shared),1)
        for m in p['changed_source_subjects']:
            data=subprocess.check_output(['git','--no-replace-objects','show',m['before_git_commit']+':'+m['path']],cwd=ROOT);self.assertEqual(data,m['before_text'].encode());self.assertEqual(sha(data),m['before_sha256']);self.assertEqual(sha((ROOT/m['path']).read_bytes()),m['current_sha256'])
        for m in p['reviews']+p['authored_stores']+p['authored_reviews']:self.assertEqual((ROOT/m['path']).read_bytes(),m['text'].encode())
        for m in p['product_members']:self.assertEqual(sha((ROOT/m['path']).read_bytes()),m['sha256'])
        self.assertEqual(subprocess.check_output(['git','--no-replace-objects','diff','--name-only',p['source_parent'],'--','projects','testing','reference','fixtures'],cwd=ROOT),b'')

    def test_actual_CLI_reaches_runtime_gate_and_retains_all_other_failures(self):
        p=json.load(gzip.open(ROOT/'compatibility/rc/chip-focus-native-requalification-prior.json.gz','rt'));before=json.loads((ROOT/'compatibility/rc/chip-focus-native-requalification-cli-before.json').read_bytes());after=json.loads((ROOT/'compatibility/rc/chip-focus-native-requalification-cli-after.json').read_bytes());profiles=p['native_inventory']['profiles'];ids={r['sha'] for r in profiles}
        selected=[r for r in after['artifact_behavior_evidence'] if r['sha'] in ids];self.assertEqual(len(selected),len(ids));self.assertTrue(all(r['ok'] is False and r['detail']=='missing coordinator run' for r in selected))
        initial=[r for r in before['artifact_behavior_evidence'] if r['sha'] in ids];self.assertEqual(sum(r['detail']=='missing coordinator run' for r in initial),3)
        self.assertEqual(before['evidence_failures'],after['evidence_failures']);self.assertFalse(any(r['sha'] in ids for r in after['evidence_failures']))
        self.assertEqual(after['ledger_sha256'],sha((ROOT/p['ledger_path']).read_bytes()));self.assertEqual(before['ledger_sha256'],p['ledger_sha256'])
        self.assertEqual(after['disposition_admission'],'incomplete');self.assertEqual(after['g11_claim'],'not-passed')
        reasons={r['reason'] for r in after['evidence_failures']};self.assertIn('invalid-build-scope',reasons);self.assertIn('invalid-test-consolidation-scope',reasons)
        self.assertEqual(after['authored_use_review_evidence']['insufficient'],21);self.assertEqual(after['current_authored_use_inventory']['additional_uses'],308);self.assertFalse(after['current_authored_use_inventory']['source_snapshot_valid'])
        if p['line']=='21.x':self.assertEqual(after['unresolved_in_ledger'],1361)

if __name__=='__main__':unittest.main()
