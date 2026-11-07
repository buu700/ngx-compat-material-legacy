# @license
# Copyright Google LLC All Rights Reserved.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.dev/license
# Copyright (c) 2026 Ryan Lester.
from pathlib import Path
from unittest import TestCase, mock
import copy, hashlib, importlib.util, json, tempfile

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('receipt_subject',ROOT/'scripts/check-dependency-eligibility.py')
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

def raw(value): return (json.dumps(value,sort_keys=True)+'\n').encode()
def sha(value): return hashlib.sha256(value).hexdigest()

class CurrentBraceReceiptTests(TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
  self.policy={'SECURITY.md':b'fixed policy','scripts/npm-tooling-options.mjs':b'fixed helper'}
  self.binding={'current_semantic_projection':{'source_parent':'a'*40,'source_files_sha256':'1'*64,'support_files_sha256':'2'*64,'input_files_sha256':'3'*64}}
  hist=[]
  for n in range(25): hist.append(self.write('compatibility/rc/tool-advisory-triage/brace-profile-validation/item-%02d.json'%n,b'{}\n',short=True))
  histref=self.write('compatibility/rc/tool-advisory-triage/brace-profile-validation/manifest.json',raw({'files':hist}))
  self.historical=histref['sha256']
  self.policyrefs=[self.write(k,v) for k,v in self.policy.items()]
  self.boundary=self.write('compatibility/rc/boundary.json',b'{"scope":"static"}\n')
  self.triage={'findings':[]};self.receipts=[]
  for ident,advisory in m.NPM_CURRENT_BRACE_IDS.items():
   finding={'triage_item_id':ident,'input_id':advisory,'verdict':'not_actionable','normalized_input':{'vulnerable_component':'npm/brace-expansion@5.0.7'}}
   self.triage['findings'].append(copy.deepcopy(finding))
   ref=self.write('compatibility/rc/'+ident+'.json',raw({'schema_version':'triage-finding/v0','findings':[finding]}))
   record={'subject_id':'npm/brace-expansion@5.0.7','advisory_id':advisory,'advisory_modified':'2026-09-10T00:00:00Z','rule_id':'npm-private-brace-inputs','classification':'not-applicable','triage_item_id':ident,'reason':'Current source-only boundary receipt has an individual contextual review.', 'scope':m.NPM_CURRENT_BRACE_SCOPE}
   self.receipts.append({'triage_item_id':ident,'advisory_id':advisory,'receipt':ref,'record':record})
  self.manifest={'schema_version':1,'role':'current-main-brace-static-receipts','line':'main',**self.binding['current_semantic_projection'],'policy_sources':self.policyrefs,'boundary_review':self.boundary,'historical_manifest':histref,'receipts':self.receipts}
  self.save()
 def write(self,path,value,short=False):
  p=self.root/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(value)
  return {'path':p.name if short else path,'sha256':sha(value),'bytes':len(value)}
 def save(self):
  self.ref=self.write(m.NPM_CURRENT_BRACE_MANIFEST_PATH,raw(self.manifest))
 def subject(self,binding=None,triage=None):
  with mock.patch.object(m,'NPM_CURRENT_BRACE_MANIFEST_SHA256',self.ref['sha256']),mock.patch.object(m,'NPM_BRACE_VALIDATION_MANIFEST',self.historical),mock.patch.object(m,'NPM_CURRENT_BRACE_POLICY',{k:sha(v) for k,v in self.policy.items()}):
   return m.private_npm_current_brace_validation(self.root,self.triage if triage is None else triage,self.binding if binding is None else binding)
 def test_positive_and_unsealed_fail(self):
  result=self.subject();self.assertEqual(set(result['findings']),set(m.NPM_CURRENT_BRACE_IDS));self.assertFalse(result['binding']['runtime_validation_claimed']);result['assert_current']()
  with self.assertRaisesRegex(ValueError,'unsealed'):m.private_npm_current_brace_validation(self.root,self.triage,self.binding)
 def test_missing_or_changed_receipt_policy_boundary_and_historical(self):
  paths=['compatibility/rc/triage-011.json','SECURITY.md','compatibility/rc/boundary.json','compatibility/rc/tool-advisory-triage/brace-profile-validation/item-00.json']
  for name in paths:
   with self.subTest(path=name):
    result=self.subject();p=self.root/name;saved=p.read_bytes()
    try:
     p.write_bytes(saved+b'changed')
     with self.assertRaises((ValueError,OSError)):self.subject()
     with self.assertRaises((ValueError,OSError)):result['assert_current']()
     p.unlink()
     with self.assertRaises((ValueError,OSError)):self.subject()
    finally:p.write_bytes(saved)
 def test_changed_markers_and_rosters(self):
  for field in self.binding['current_semantic_projection']:
   with self.subTest(field=field):
    binding=copy.deepcopy(self.binding);binding['current_semantic_projection'][field]='0'*len(binding['current_semantic_projection'][field])
    with self.assertRaises(ValueError):self.subject(binding)
 def test_resealed_wrong_roster_and_finding(self):
  saved=copy.deepcopy(self.manifest)
  for fault in ('missing','duplicate','bad_id','bad_component','bad_advisory','bad_source','wrong_scope','historical'):
   with self.subTest(fault=fault):
    self.manifest=copy.deepcopy(saved);r=self.manifest['receipts']
    if fault=='missing':r.pop()
    if fault=='duplicate':r[-1]=copy.deepcopy(r[0])
    if fault=='bad_id':r[0]['triage_item_id']='triage-015'
    if fault=='bad_advisory':r[0]['advisory_id']='GHSA-unknown'
    if fault=='bad_source':self.manifest['source_files_sha256']='0'*64
    if fault=='wrong_scope':r[0]['record']['scope']='runtime validated'
    if fault=='historical':self.manifest['historical_manifest']['sha256']='0'*64
    if fault=='bad_component':
     doc=json.loads((self.root/r[0]['receipt']['path']).read_text());doc['findings'][0]['normalized_input']['vulnerable_component']='other';r[0]['receipt']=self.write(r[0]['receipt']['path'],raw(doc))
    self.save()
    with self.assertRaises((ValueError,KeyError)):self.subject()
    if fault=='bad_component':
     found=self.triage['findings'][0];ref=self.write(r[0]['receipt']['path'],raw({'schema_version':'triage-finding/v0','findings':[found]}));saved['receipts'][0]['receipt']=ref
 def test_global_override_identity_and_modified_advisories(self):
  review=json.loads((ROOT/'compatibility/rc/tool-advisory-dispositions.json').read_text())
  byitem={};details={}
  for record in review['records']:
   byitem[record['triage_item_id']]={'verdict':'not_actionable','input_id':record['advisory_id'],'normalized_input':{'vulnerable_component':record['subject_id']}}
   details[record['advisory_id']]={'modified':record['advisory_modified']}
  result=self.subject(); overrides=result['overrides']
  # Synthetic current receipts must agree with the retained historical dates.
  for record in review['records']:
   key=(record['subject_id'],record['advisory_id'])
   if key in overrides:overrides[key]['advisory_modified']=record['advisory_modified']
  self.write('compatibility/rc/tool-advisory-dispositions.json',raw(review))
  proof={'findings':byitem,'details':details,'private_profile':{'line':'main'},'brace_overrides':overrides,'proof_sha256':'a'*64,'graph':{}}
  known=next(r for r in review['records'] if r['rule_id']=='npm-private-brace-inputs')
  obs={'unresolved':[known['subject_id']],'rows':[{'id':known['subject_id'],'vulns':[{'id':known['advisory_id'],'modified':known['advisory_modified']},{'id':'GHSA-new','modified':known['advisory_modified']}]}]}
  with mock.patch.object(m,'tool_advisory_coverage_ok',return_value=True),mock.patch.object(m,'tool_disposition_evidence',return_value=proof):
   classified=m.classify_tool_findings(self.root,obs)
   self.assertEqual(len(classified['not_applicable']),1);self.assertEqual(classified['unresolved'],[known['subject_id']])
   changed=copy.deepcopy(obs);changed['rows'][0]['vulns'][0]['modified']='2027-01-01T00:00:00Z'
   self.assertEqual(m.classify_tool_findings(self.root,changed)['not_applicable'],[])
   proof['brace_overrides']={}
   self.assertIn('incomplete current',m.classify_tool_findings(self.root,obs)['errors'][0])
   proof['private_profile']['line']='21.x'
   self.assertEqual(len(m.classify_tool_findings(self.root,obs)['not_applicable']),1)

 def test_21_historical_reader_is_unchanged(self):
  source=(ROOT/'scripts/check-dependency-eligibility.py').read_text()
  def extract(s):return s[s.index('def private_npm_brace_validation('):s.index('\ndef private_npm_source_paths(')]
  historical=extract(source).split('\n# Intentionally unsealed')[0].rstrip()
  self.assertEqual(sha(historical.encode()),'85f74269ebdef1030dc953205709c86881183bf384b575cdec11291fa0aeae30')
