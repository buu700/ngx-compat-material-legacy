# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Synthetic validator/lifecycle controls; these do not qualify source suites or G11."""
import copy
import importlib.util
import json
import os
import subprocess
import sys
import time
from pathlib import Path
import tempfile
import unittest

P=Path(__file__).resolve().parents[1]/'scripts/check-source-contract-regressions.py'
spec=importlib.util.spec_from_file_location('producer',P)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class ValidatorTests(unittest.TestCase):
 def setUp(self):
  self.rows=[{'path':'scripts/a.mjs','sha256':'a'*64,'bytes':3},{'path':'tests/b.mjs','sha256':'b'*64,'bytes':4}]
  self.r={'result':'pass','line':'21.x','source_execution_mode':'complete-regression','full_source_fault_lifetimes_executed':True,'bound_current_paths':2,'cold_source_faults_rejected':2,'late_source_faults_rejected':2,'cold_source_fault_paths_rejected':['scripts/a.mjs','tests/b.mjs'],'late_source_fault_paths_rejected':['scripts/a.mjs','tests/b.mjs'],'canonical_frame_admission_granted':False,'g11_claim':'not-passed','actual_guard_exclusion_checks':25,'old_checker_executed':False,'actual_complete_checker_admission_or_native_packed_browser_floor_or_full_audit_qualified':False}
 def test_complete_and_invalid_lifetimes(self):
  m.validate_report('checker',self.r,self.rows,'21.x')
  for key,value in [('source_execution_mode','source-metadata'),('full_source_fault_lifetimes_executed',False),('cold_source_fault_paths_rejected',[]),('cold_source_fault_paths_rejected',['scripts/a.mjs']*2),('late_source_fault_paths_rejected',['scripts/a.mjs','other']),('late_source_faults_rejected',0),('bound_current_paths',True),('line','main'),('result','fail'),('actual_guard_exclusion_checks',26)]:
   candidate=copy.deepcopy(self.r);candidate[key]=value
   with self.subTest(key=key,value=value),self.assertRaises(ValueError):m.validate_report('checker',candidate,self.rows,'21.x')
  bad=copy.deepcopy(self.r);bad.pop('cold_source_fault_paths_rejected')
  with self.assertRaises(ValueError):m.validate_report('checker',bad,self.rows,'21.x')
 def test_browser_exact_controls(self):
  r=copy.deepcopy(self.r);r.update(title_contract_negative_controls=47,whole_current_dialog_probe_collaborator_runs=[{}]*8,complete_source_transitions=4,individually_reviewed_hunks=23,old_programs_executed=False,actual_angular_DOM_browser_or_packed_execution=False,actual_native_packed_browser_floor_or_full_audit_qualified=False)
  m.validate_report('browser',r,self.rows,'21.x')
  for key,value in [('title_contract_negative_controls',46),('whole_current_dialog_probe_collaborator_runs',[{}]*7),('old_programs_executed',True)]:
   c=copy.deepcopy(r);c[key]=value
   with self.assertRaises(ValueError):m.validate_report('browser',c,self.rows,'21.x')
 def test_rows_and_identity(self):
  for rows in [[],self.rows+self.rows[:1],[{'path':'../bad','sha256':'a'*64,'bytes':1}]]:
   with self.assertRaises(ValueError):m.rows_by_path(rows)
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);out=root/'evidence'/m.CHECK/'nonce';out.mkdir(parents=True)
   binding={'run_id':'run','source_line':'21.x','source_commit':'a'*40,'source_tree':'b'*40,'source_clean':True,'input_clean':True}
   env={'RC_CHECK_ID':m.CHECK,'RC_RUN_ID':'run','RC_INVOCATION_ID':'nonce','RC_EVIDENCE_BINDING':json.dumps(binding),'RC_ASSERTION_OUTPUT_DIR':str(out)}
   self.assertEqual(m.request_from_env(env,root,('a'*40,'b'*40),'21.x')['run_id'],'run')
   for key,value in [('RC_CHECK_ID','wrong'),('RC_RUN_ID','other'),('RC_INVOCATION_ID','other')]:
    bad=dict(env);bad[key]=value
    with self.assertRaises(ValueError):m.request_from_env(bad,root,('a'*40,'b'*40),'21.x')
   with self.assertRaises(ValueError):m.request_from_env(env,root,('c'*40,'b'*40),'21.x')
   self.assertIsNone(m.request_from_env({},root,('a'*40,'b'*40),'21.x'))
 def test_children_drop_coordinator_authority(self):
  from unittest.mock import patch
  with patch.dict(m.os.environ,{'RC_FAKE':'secret-test','RC_RUN_ID':'run','SAMPLE_SAFE':'yes'},clear=True):
   self.assertEqual(m.child_env(),{'SAMPLE_SAFE':'yes'})

class LifecycleAndEnvelopeTests(unittest.TestCase):
 def test_timeout_kills_descendant_holding_output_pipe(self):
  with tempfile.TemporaryDirectory() as d:
   pidfile=Path(d)/'child.pid'
   program="import subprocess,sys,time; p=subprocess.Popen([sys.executable,'-c','import time; time.sleep(30)']); open(sys.argv[1],'w').write(str(p.pid)); time.sleep(30)"
   start=time.monotonic()
   with self.assertRaises(subprocess.TimeoutExpired):
    m.run_child([sys.executable,'-c',program,str(pidfile)],Path(d),0.5)
   self.assertLess(time.monotonic()-start,5)
   pid=int(pidfile.read_text())
   stat=Path(f'/proc/{pid}/stat')
   # An orphan may briefly be a zombie awaiting its new parent to reap it.
   try: state=stat.read_text().split(') ',1)[1]
   except FileNotFoundError: state='Z '
   self.assertTrue(state.startswith('Z '))
 def test_failure_envelope_does_not_claim_uninvoked_case(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);out=root/'evidence'/m.CHECK/'nonce';out.mkdir(parents=True);(root/'reports').mkdir()
   req={'run_id':'run','invocation':'nonce','line':'21.x','output':out,'run_dir':root,'binding':{}}
   cases=[{'case_id':m.IDS[0],'result':'unresolved'},{'case_id':m.IDS[1],'result':'fail'}]
   self.assertFalse(m.write_acceptance(req,cases,{},('a'*40,'b'*40)))
   report=json.loads((root/'reports'/f'{m.CHECK}.json').read_text())
   self.assertEqual(report['executed_case_ids'],[m.IDS[1]])
   self.assertEqual(report['unresolved_case_ids'],[m.IDS[0]])
   self.assertEqual(report['failed_case_ids'],[m.IDS[1]])
   self.assertEqual((report['result'],report['exit_code'],report['coverage']),('fail',1,'incomplete'))
 def test_extra_arguments_rejected_before_work(self):
  child=subprocess.run([sys.executable,str(P),'--line','main'],capture_output=True,text=True,timeout=5)
  self.assertNotEqual(child.returncode,0)
  self.assertIn('no command-line arguments',child.stderr)

if __name__=='__main__':unittest.main()
