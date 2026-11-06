# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent source-only patch reconstruction and actual current guard checks."""
from pathlib import Path
import hashlib,json,os,re,subprocess,unittest
ROOT=Path(__file__).resolve().parents[1]
def digest(raw):return hashlib.sha256(raw).hexdigest()
def reconstruct(before,diff):
 lines=before.decode().splitlines(keepends=True);out=[];cursor=0
 hunks=re.split(r'(?=^@@ )',diff,flags=re.M)[1:]
 for hunk in hunks:
  parts=hunk.splitlines(keepends=True);match=re.match(r'^@@ -(\d+),(\d+) \+(\d+),(\d+) @@',parts.pop(0));assert match
  start=int(match[1])-1;assert start>=cursor;out.extend(lines[cursor:start]);old=[];new=[]
  for row in parts:
   assert row[0]in' +-'
   if row[0]!='+':old.append(row[1:])
   if row[0]!='-':new.append(row[1:])
  assert len(old)==int(match[2])and len(new)==int(match[4]);assert lines[start:start+len(old)]==old
  out.extend(new);cursor=start+len(old)
 return ''.join(out+lines[cursor:]).encode()
class CheckerReferenceSourceTests(unittest.TestCase):
 def test_independent_complete_patch_reconstruction_and_corruptions(self):
  packet=json.loads((ROOT/'compatibility/rc/c04-checker-reference-source-inputs.json').read_bytes())
  environment=dict(os.environ,GIT_NO_LAZY_FETCH='1',GIT_NO_REPLACE_OBJECTS='1')
  for key in ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']:environment.pop(key,None)
  old=subprocess.check_output(['git','--no-replace-objects','show',packet['old_checker']['commit']+':'+packet['old_checker']['path']],cwd=ROOT,env=environment)
  self.assertEqual(digest(old),packet['old_checker']['sha256']);self.assertEqual(len(old),packet['old_checker']['bytes'])
  current=(ROOT/packet['current_checker']['path']).read_bytes();self.assertEqual(digest(current),packet['current_checker']['sha256'])
  self.assertEqual(reconstruct(old,packet['complete_diff']),current)
  self.assertEqual(len(packet['hunk_reviews']),7 if packet['line']=='21.x'else 6)
  for row in packet['hunk_reviews']:self.assertEqual(digest(row['text'].encode()),row['sha256']);self.assertGreater(len(row['decision']),100)
  # A patch omission,duplicated hunk,stale body and altered original all fail
  # independently of the JS literal-reconstruction mechanism.
  hunks=re.split(r'(?=^@@ )',packet['complete_diff'],flags=re.M)[1:]
  for candidate in [''.join(hunks[:-1]),''.join(hunks+[hunks[-1]]),packet['complete_diff'].replace('+    bytes = rulesJsBuildOriginalPatch(readRegularRepoBytes,entry.sha);','+    bytes = Buffer.from("altered");')]:
   try:result=reconstruct(old,candidate)
   except AssertionError:continue
   self.assertNotEqual(result,current)
  changed=bytearray(old);changed[old.index(b'function evidenceClass')]=ord('F')
  try:result=reconstruct(bytes(changed),packet['complete_diff'])
  except AssertionError:pass
  else:self.assertNotEqual(result,current)
  original_ledger=subprocess.check_output(['git','--no-replace-objects','show',packet['source_parent']+':compatibility/f10/disposition-ledger/ledger.json'],cwd=ROOT,env=environment)
  self.assertEqual(digest(original_ledger),packet['protected_ledger']['sha256'])
 def test_actual_current_predicates_reader_contracts_and_source_mutations(self):
  command=['node','tests/checker_reference_source_probe.mjs','--metadata']
  if os.environ.get('CHECKER_REFERENCE_SOURCE_REPORT'):command.append(os.environ['CHECKER_REFERENCE_SOURCE_REPORT'])
  child=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=180)
  self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-8000:]);r=json.loads(child.stdout);self.assertEqual(r['result'],'pass');self.assertFalse(r['canonical_frame_admission_granted'])
  self.assertEqual(r['selected_references'],5 if r['line']=='21.x'else 13)
  self.assertEqual(r['actual_guard_exclusion_checks'],25 if r['line']=='21.x'else 26)
  self.assertGreater(r['original_functions_preserved'],10);self.assertEqual(r['changed_original_functions'],['evidenceClass','individualPatchBound'])
  self.assertEqual(r['structural_policy_sets_preserved'],5);self.assertEqual(r['actual_current_reader_cases'],17)
  self.assertEqual(r['cold_source_faults_rejected'],r['bound_current_paths']);self.assertEqual(r['late_source_faults_rejected'],r['bound_current_paths'])
  self.assertTrue(r['canonical_ledger_unchanged']);self.assertTrue(r['root_checker_unchanged']);self.assertFalse(r['old_checker_executed'])
  self.assertFalse(r['actual_complete_checker_admission_or_native_packed_browser_floor_or_full_audit_qualified'])
