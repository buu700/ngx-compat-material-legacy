# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Bounded controls for the independent browser metadata evidence checks."""
import copy,importlib.util,json,subprocess,sys,tempfile,unittest
from pathlib import Path
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('browser_independent_support',HERE/'browser_reference_independent_support.py')
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
ROOT=HERE.parent if (HERE.parent/'projects/ngx-material-legacy/package.json').is_file() else Path.cwd()
VERSION=json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_bytes())['version']
ROOTS={'21.x' if VERSION.startswith('21.') else 'main':ROOT}
class MetadataEvidenceTests(unittest.TestCase):
 def test_actual_zone_git_and_literal_mutants(self):
  for line,root in ROOTS.items():
   raw=(root/h.ZONE_PACKET).read_bytes();packet=json.loads(raw);row=packet['browser'][line]
   old=h.git_data(root,row['old_commit'],h.ZONE_PATH);new=h.git_data(root,row['new_commit'],h.ZONE_PATH)
   source=json.loads((root/'compatibility/rc/c04-browser-reference-source-inputs.json').read_bytes())
   transitions={r['path']:r for r in source['transitions']};prior=transitions[h.ZONE_PATH]['after']
   self.assertEqual(h.verify_zone_data(raw,line,prior,old,new,new)['after'],row['after'])
   for changed in (raw+b' ',):
    with self.assertRaises(AssertionError):h.verify_zone_data(changed,line,prior,old,new,new)
   for bad_old,bad_new,bad_disk in ((old+b' ',new,new),(old,new+b' ',new),(old,new,new+b' ')):
    with self.assertRaises(AssertionError):h.verify_zone_data(raw,line,prior,bad_old,bad_new,bad_disk)
   bad=copy.deepcopy(row['edits']);bad[0]['offset']+=1
   with self.assertRaises(AssertionError):h.replay(old,bad)
   bad=copy.deepcopy(row['edits']);bad[0]['before']+='X'
   with self.assertRaises(AssertionError):h.replay(old,bad)
   bad=copy.deepcopy(prior);bad['bytes']+=1
   with self.assertRaises(AssertionError):h.verify_zone_data(raw,line,bad,old,new,new)
 def test_real_four_helpers(self):
  for line,root in ROOTS.items():
   source=json.loads((root/'compatibility/rc/c04-browser-reference-source-inputs.json').read_bytes())
   h.verify_helpers(root,line,{r['path']:r for r in source['transitions']})
 def test_all_other_helpers_physical_mutation(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);transitions={h.ZONE_PATH:{}}
   for i in range(3):
    path='helper'+str(i);raw=bytes([65+i]);(root/path).write_bytes(raw)
    transitions[path]={'after':{'sha256':h.digest(raw),'bytes':len(raw)}}
   h.verify_other_helpers(root,transitions)
   for i in range(3):
    path=root/('helper'+str(i));original=path.read_bytes();path.write_bytes(original+b'x')
    with self.assertRaises(AssertionError):h.verify_other_helpers(root,transitions)
    path.write_bytes(bytes([original[0]+3]))
    with self.assertRaises(AssertionError):h.verify_other_helpers(root,transitions)
    path.write_bytes(original)
 def test_full_fault_roster_and_report_mutants(self):
  ledger=b'ledger';row={'path':'x','sha256':h.digest(b'abc'),'bytes':3}
  sem={'line':'21.x','result':'pass','current_physical_ledger_sha256':h.digest(ledger),'current_physical_ledger_bytes':len(ledger),'canonical_frame_admission_granted':False,'old_programs_executed':False,'actual_native_packed_browser_floor_or_full_audit_qualified':False,'g11_claim':'not-passed'}
  baseline={'bound':[row],'report':sem};report={**sem,'source_execution_mode':'complete-regression','full_source_fault_lifetimes_executed':True,'bound_current_paths':1,'cold_source_faults_rejected':1,'late_source_faults_rejected':1,'cold_source_fault_paths_rejected':['x'],'late_source_fault_paths_rejected':['x'],'title_contract_negative_controls':47,'whole_current_dialog_probe_collaborator_runs':[{}]*8,'actual_angular_DOM_browser_or_packed_execution':False}
  self.assertEqual(h.validate_full_report(report,baseline,'21.x',ledger),[row])
  for key,val in [('source_execution_mode','source-metadata'),('full_source_fault_lifetimes_executed',False),('cold_source_faults_rejected',0),('late_source_fault_paths_rejected',['other']),('canonical_frame_admission_granted',True),('actual_angular_DOM_browser_or_packed_execution',True),('g11_claim','passed'),('current_physical_ledger_bytes',999)]:
   bad=copy.deepcopy(report);bad[key]=val
   with self.subTest(key=key),self.assertRaises(AssertionError):h.validate_full_report(bad,baseline,'21.x',ledger)
  bad=copy.deepcopy(report);bad.pop('actual_angular_DOM_browser_or_packed_execution')
  with self.assertRaises(KeyError):h.validate_full_report(bad,baseline,'21.x',ledger)
  with self.assertRaises(AssertionError):h.validate_full_report(report,baseline,'21.x',ledger+b'x')
  bad=copy.deepcopy(baseline);bad['bound'].append(row)
  with self.assertRaises(AssertionError):h.validate_full_report(report,bad,'21.x',ledger)
 def test_real_temporary_physical_checks_and_strict_frame(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);(root/'x').write_bytes(b'abc');rows=[{'path':'x','sha256':h.digest(b'abc'),'bytes':3}]
   h.verify_physical(root,rows);(root/'x').write_bytes(b'abd')
   with self.assertRaises(AssertionError):h.verify_physical(root,rows)
  h.assert_strict_frame(b'before',b'before',b'after');h.assert_strict_frame(b'after',b'before',b'after')
  with self.assertRaises(AssertionError):h.assert_strict_frame(b'other',b'before',b'after')
 def test_unknown_flag_rejected_before_work(self):
  child=subprocess.run([sys.executable,str(HERE/'browser_reference_independent.py'),'--not-a-mode'],capture_output=True,text=True,timeout=5)
  self.assertNotEqual(child.returncode,0);self.assertIn('unrecognized arguments',child.stderr)
if __name__=='__main__':unittest.main()
