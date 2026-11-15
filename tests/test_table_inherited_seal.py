# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from rc_acceptance import TABLE_LOADED_FILES, EvidenceError, EvidenceSnapshot, validate_table_live_outputs
SHA = '27dae25a420e76817a1209f373326084ae6dd11c'

class TableSealerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'root'; self.run_dir = Path(self.temp.name) / 'run'
        self.root.mkdir(); self.run_dir.mkdir(); self.prefix = 'evidence/upstream-audit-disposition/invoke/'
        (self.run_dir / self.prefix).mkdir(parents=True)
        for name in TABLE_LOADED_FILES:
            p = self.root / name; p.parent.mkdir(parents=True, exist_ok=True); p.write_text('trusted test checker')
        ledger = self.root / 'compatibility/f10/disposition-ledger/ledger.json'; ledger.parent.mkdir(parents=True)
        ledger.write_text(json.dumps({'entries':[{'sha':SHA,'individual_proof':{'proof_kind':'main-table-inherited-native'}}]}))
        self.binding={'source_commit':'a'*40,'source_tree':'b'*40}; self.run={'run_id':'run'}; self.library={'sha256':'c'*64,'bytes':10}
        self.modes={m:{'cases':{SHA:True},'supplemental':{'sticky-rows':True}} for m in ('zoneless','zoneful')}
        self.nonce='d'*32; self.filename=f'table-live-{self.nonce}.json';self.live_path=self.run_dir/self.prefix/self.filename
        self.live_path.write_text('{"raw":"fixture"}');self.live=self.record(self.live_path)
        self.stage=self.run_dir/self.prefix/'table-live-Abc123'/'dist';self.stage.mkdir(parents=True);(self.stage/'zoneful.js').write_text('zoneful');(self.stage/'zoneless.js').write_text('zoneless');self.inputs=[self.record(self.stage/'zoneful.js'),self.record(self.stage/'zoneless.js')]
        self.row={'sha':SHA,'execution':'live-packed-native-table','output':self.filename,'nonce':self.nonce,'sha256':self.live['sha256'],'bytes':self.live['bytes'],'run_id':'run','invocation_id':'invoke','library':self.library,'modes':self.modes,'ok':True}
        self.assertion_path=self.run_dir/self.prefix/'disposition-observations.json';self.write_assertion();self.report={'outputs':[self.record(self.assertion_path),self.live]}
    def record(self,path):
        data=path.read_bytes();return {'path':path.relative_to(self.run_dir).as_posix(),'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
    def write_assertion(self):
        self.assertion_path.write_text(json.dumps({'run_id':'run','invocation_id':'invoke','binding':self.binding,'inherited_execution_evidence':[self.row]}))
    def invoke(self):
        fake=SimpleNamespace(returncode=0,stderr='',stdout=json.dumps({'ok':True,'record':self.live,'modes':self.modes,'validated_run_files':self.inputs}))
        with patch('rc_acceptance.subprocess.run',return_value=fake):
            snapshot=EvidenceSnapshot(self.root,self.run_dir);result=validate_table_live_outputs(snapshot,self.root,self.run_dir/'run.json',self.run,self.report,self.binding,'invoke',self.library);snapshot.revalidate();return result
    def test_positive(self): self.assertIn(self.live['path'],self.invoke())
    def test_prior_datepicker_ledger_role_and_postcheck_mutation(self):
        fake=SimpleNamespace(returncode=0,stderr='',stdout=json.dumps({'ok':True,'record':self.live,'modes':self.modes,'validated_run_files':self.inputs}))
        snapshot=EvidenceSnapshot(self.root,self.run_dir)
        snapshot.json('repository','compatibility/f10/disposition-ledger/ledger.json','datepicker-ledger')
        with patch('rc_acceptance.subprocess.run',return_value=fake):
            validate_table_live_outputs(snapshot,self.root,self.run_dir/'run.json',self.run,self.report,self.binding,'invoke',self.library)
        self.live_path.write_text('{"raw":"after-check"}')
        with self.assertRaises(EvidenceError):snapshot.revalidate()
    def test_definition_owner_is_snapshotted_and_mutation_rejected(self):
        owner='projects/ngx-material-legacy/legacy-table/internal/definition-owner.ts'
        self.assertIn(owner,TABLE_LOADED_FILES)
        fake=SimpleNamespace(returncode=0,stderr='',stdout=json.dumps({'ok':True,'record':self.live,'modes':self.modes,'validated_run_files':self.inputs}))
        snapshot=EvidenceSnapshot(self.root,self.run_dir)
        with patch('rc_acceptance.subprocess.run',return_value=fake):
            validate_table_live_outputs(snapshot,self.root,self.run_dir/'run.json',self.run,self.report,self.binding,'invoke',self.library)
        (self.root/owner).write_text('changed owner')
        with self.assertRaises(EvidenceError):snapshot.revalidate()
    def test_bundle_mutation_after_replay_rejected(self):
        fake=SimpleNamespace(returncode=0,stderr='',stdout=json.dumps({'ok':True,'record':self.live,'modes':self.modes,'validated_run_files':self.inputs}))
        snapshot=EvidenceSnapshot(self.root,self.run_dir)
        with patch('rc_acceptance.subprocess.run',return_value=fake):
            validate_table_live_outputs(snapshot,self.root,self.run_dir/'run.json',self.run,self.report,self.binding,'invoke',self.library)
        (self.stage/'zoneful.js').write_text('changed')
        with self.assertRaises(EvidenceError):snapshot.revalidate()
    def test_missing_duplicate_and_subject_omission(self):
        self.report['outputs']=self.report['outputs'][:1]
        with self.assertRaises(EvidenceError):self.invoke()
        self.report['outputs'].extend([self.live,self.live])
        with self.assertRaises(EvidenceError):self.invoke()
        self.report['outputs']=[self.record(self.assertion_path),self.live];self.row['sha']='e'*40;self.write_assertion();self.report['outputs'][0]=self.record(self.assertion_path)
        with self.assertRaises(EvidenceError):self.invoke()
    def test_mutated_bytes_and_foreign_hash(self):
        self.live_path.write_text('{"raw":"changed"}')
        with self.assertRaises(EvidenceError):self.invoke()
        self.live_path.write_text('{"raw":"fixture"}');self.report['outputs'][1]=dict(self.live,sha256='0'*64)
        with self.assertRaises(EvidenceError):self.invoke()
    def test_changed_mode_or_result_rejected(self):
        self.row['modes']={'zoneless':self.modes['zoneless']};self.write_assertion();self.report['outputs'][0]=self.record(self.assertion_path)
        with self.assertRaises(EvidenceError):self.invoke()
        self.row['modes']=self.modes;self.row['ok']=False;self.write_assertion();self.report['outputs'][0]=self.record(self.assertion_path)
        with self.assertRaises(EvidenceError):self.invoke()

if __name__=='__main__':unittest.main()
