# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Inventory proposals preserve judgments and reject incomplete successors."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import gzip,hashlib,json,subprocess,sys,unittest
ROOT=Path(__file__).resolve().parents[1]
SHARDS=32
PHASES=[f'boundary:{i}' for i in range(4)]+[f'namespace:{i}' for i in range(3)]+[f'sticky:{ci}:{ei}' for ci in range(2) for ei in range(2)]+['images']+[f'{kind}:{i}' for kind in ('late','cold') for i in range(SHARDS)]
LEDGER='compatibility/f10/disposition-ledger/ledger.json'
STAGE='compatibility/rc/c04-inventory-reference-proposal-after.json.gz'

def producer(cohort):
 child=subprocess.run(['node','tests/inventory_reference_proposal_probe.mjs','--cohort',cohort],cwd=ROOT,capture_output=True,text=True,timeout=120)
 if child.returncode: raise AssertionError((child.stdout+child.stderr)[-7000:])
 return json.loads(child.stdout)

def aggregate(roster,results):
 if not (roster['schema_version']==1 and roster['cohort']=='roster'): raise AssertionError
 if not (roster['line'] in ('main','21.x')): raise AssertionError
 expected_line='21.x' if json.loads((ROOT/'projects/ngx-material-legacy/package.json').read_text())['version'].startswith('21.') else 'main'
 if not (roster['line']==expected_line): raise AssertionError
 stage=gzip.decompress((ROOT/STAGE).read_bytes())
 if not (roster['after_sha256']==hashlib.sha256(stage).hexdigest() and roster['after_bytes']==len(stage)): raise AssertionError
 refs=roster['bound'];paths=[r['path'] for r in refs]
 if not (len(paths)>=SHARDS and len(set(paths))==len(paths) and paths.count(LEDGER)==1): raise AssertionError
 if roster['line']=='main':
  roster_bytes=(ROOT/'tests/inventory_reference_main_roster.json').read_bytes()
  if hashlib.sha256(roster_bytes).hexdigest()!='30c55c92e88fd49badc75452c4ab4e88aae0e26202d15d92b06fbb317629aca9': raise AssertionError
  expected_paths=json.loads(roster_bytes)
  if not (len(expected_paths)==163 and len(set(expected_paths))==163 and sorted(paths)==expected_paths): raise AssertionError
 for ref in refs:
  path=ref['path']
  if not (isinstance(path,str) and not path.startswith('/') and all(x not in ('','.','..') for x in path.split('/'))): raise AssertionError
  raw=gzip.decompress((ROOT/STAGE).read_bytes()) if path==LEDGER else (ROOT/path).read_bytes()
  if not (ref=={'path':path,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}): raise AssertionError
 if not (len(results)==len(PHASES) and set(results)==set(PHASES)): raise AssertionError
 for name in PHASES:
  r=results[name]
  if not (r['schema_version']==1 and r['cohort']==name and r['line']==roster['line']): raise AssertionError
  if not (r['bound']==refs and r['after_sha256']==roster['after_sha256'] and r['after_bytes']==roster['after_bytes']): raise AssertionError
  n=20 if roster['line']=='main' else 19
  if not (r['metadata_reference_updates']==n and r['unselected_entries_preserved']==1697-n): raise AssertionError
  if not (r['canonical_owner_integration_complete'] is False and r['native_qualified'] is False and r['g11_claim']=='not-passed'): raise AssertionError
  if name.startswith(('late:','cold:')):
   _,i=name.split(':'); expected=[path for index,path in enumerate(paths) if index%SHARDS==int(i)]
   if not (r['cases']==expected and r['partial']==r['historical']==r['other']==0): raise AssertionError
  else:
   if name.startswith('boundary:'):
    i=int(name.split(':')[1]);mode=('construction','assertCurrent','verifyAfter','inverse')[i]
    expected_cases=[f'boundary:{mode}']
    if i==0: expected_cases.append('early:projects/ngx-material-legacy/legacy-select/select.spec.ts')
    if i==1: expected_cases.append('early:'+LEDGER)
    if i==2: expected_cases.append('physical-before-stage')
   elif name.startswith('namespace:'):
    i=int(name.split(':')[1]);expected_cases=['namespace:'+('construction','assertCurrent','verifyAfter')[i]]
   elif name.startswith('sticky:'):
    _,ci,ei=name.split(':');ci=int(ci);ei=int(ei)
    expected_cases=([f'sticky:factory:{ci}'] if ei==0 else [])+[f'sticky:{ci}:{ei}:{ni}' for ni in range(3)]
   else:
    packet=json.loads((ROOT/'compatibility/rc/c04-inventory-reference-proposal.json').read_text())
    expected_cases=['forged-ledger']+[f"partial:{x['sha']}:{x['pointer']}" for x in packet['updates']]+[f"historical:{x['sha']}:{x['pointer']}" for x in packet['older_historical_references_to_preserve']]+[f'fault:{x}' for x in ('disposition','reason','proof','summary','G11','other-reference','unselected-entry','extra-byte')]+['immutable-output-and-ledger']
   if not (r['cases']==expected_cases and len(set(r['cases']))==len(r['cases'])): raise AssertionError
   expected=(20 if roster['line']=='main' else 19,20,8) if name=='images' else (0,0,0)
   if not ((r['partial'],r['historical'],r['other'])==expected): raise AssertionError
 return True

class InventoryReferenceProposalTests(unittest.TestCase):
 def test_fresh_real_producer_and_all_metadata_source_corruption_controls(self):
  roster=producer('roster')
  with ThreadPoolExecutor(max_workers=4) as pool:
   results=dict(zip(PHASES,pool.map(producer,PHASES)))
  self.assertTrue(aggregate(roster,results))
  # A missing, duplicated, unknown, or misattributed case must fail closed.
  import copy
  for mutation in ('missing','duplicate','unknown','wrong_subject','wrong_phase','missing_phase','unknown_phase','wrong_line','wrong_status','missing_control','unknown_control'):
   bad=copy.deepcopy(results);target=bad['late:0']
   if mutation=='missing': target['cases'].pop()
   if mutation=='duplicate': target['cases'].append(target['cases'][0])
   if mutation=='unknown': target['cases'][0]='unknown/path'
   if mutation=='wrong_subject': target['after_sha256']='0'*64
   if mutation=='wrong_phase': target['cohort']='cold:0'
   if mutation=='missing_phase': del bad['sticky:0:0']
   if mutation=='unknown_phase': bad['unexpected']=bad['sticky:0:0']
   if mutation=='wrong_line': target['line']='21.x' if roster['line']=='main' else 'main'
   if mutation=='wrong_status': target['g11_claim']='passed'
   if mutation=='missing_control': bad['boundary:0']['cases'].pop()
   if mutation=='unknown_control': bad['sticky:0:0']['cases'].append('sticky:unexpected')
   with self.assertRaises(AssertionError): aggregate(roster,bad)
  if roster['line']=='main':
   # Omit one path consistently from roster, all reports and sharded cases.
   bad_roster=copy.deepcopy(roster);bad_results=copy.deepcopy(results)
   omitted='testing/legacy-runner/shims/harness/tooltip/shared.spec.ts'
   bad_roster['bound']=[ref for ref in bad_roster['bound'] if ref['path']!=omitted]
   remaining=[ref['path'] for ref in bad_roster['bound']]
   for name,result in bad_results.items():
    result['bound']=copy.deepcopy(bad_roster['bound'])
    if name.startswith(('late:','cold:')):
     index=int(name.split(':')[1]);result['cases']=[path for i,path in enumerate(remaining) if i%SHARDS==index]
   with self.assertRaises(AssertionError): aggregate(bad_roster,bad_results)
 def test_independent_python_byte_token_derivation_matches_whole_after_image(self):
  child=subprocess.run([sys.executable,'tests/inventory_reference_independent.py'],cwd=ROOT,capture_output=True,text=True,timeout=30)
  self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-7000:]);r=json.loads(child.stdout);n=20 if r['line']=='main'else 19
  self.assertEqual(r['hash_scalar_replacements'],n);self.assertEqual(r['unselected_entry_bytes_preserved'],1697-n)
  self.assertTrue(r['canonical_ledger_unchanged']);self.assertFalse(r['canonical_owner_integration_complete']);self.assertFalse(r['actual_native_packed_browser_floor_or_full_audit_qualified'])
