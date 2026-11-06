# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
import copy,sys,unittest,subprocess
from pathlib import Path
from types import SimpleNamespace
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'));sys.path.insert(0,str(ROOT/'tests'))
from owned_rendered_admission import owned_rendered_ok,owned_schema
from owned_style_fixture import style_receipt
class ProposalTest(unittest.TestCase):
 def test_live_assessment_controls(self):
  child=subprocess.run(['node',str(ROOT/'tests/c02_owned_style_controls.mjs')],capture_output=True,text=True);self.assertEqual(child.returncode,0,child.stdout+child.stderr)
 def test_admission_rejects_broken_visibility_states_and_lifecycle(self):
  for line in ('21.x','main'):
   v='21.2.14' if line=='21.x' else '22.1.7'
   a=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[{'id':'library','sha256':'d'*64}],'oracles':{'current_peer':[{'id':'@angular/material','version':v},{'id':'@angular/cdk','version':v},{'id':'@angular/core','version':'21.2.23' if line=='21.x' else '22.1.7'}]}})
   for suffix in ('light/visible-disabled-placeholder','theme-dark/visible-disabled-placeholder','light/snack-focused-action','theme-dark/snack-disabled-action'):
    body=style_receipt(ROOT,a,'owned-style/'+suffix,'one');self.assertTrue(owned_rendered_ok(ROOT,a,body,'one'),suffix)
    for p in body['properties']:
     if p['property'] in ('visibility','opacity','effective-opacity','state-active','rect-height','rect-width'):
      bad=copy.deepcopy(body);q=next(x for x in bad['properties'] if x['property']==p['property']);q.update(reference='hidden' if p['property']=='visibility' else 'false' if p['property']=='state-active' else '0');q['candidate']=q['reference'];self.assertFalse(owned_rendered_ok(ROOT,a,bad,'one'),(suffix,p))
    if '/snack-' in suffix:
     for key in body['lifecycle']:
      bad=copy.deepcopy(body);bad['lifecycle'][key]=[] if isinstance(bad['lifecycle'][key],list) else False;self.assertFalse(owned_rendered_ok(ROOT,a,bad,'one'),(suffix,key))
if __name__=='__main__':unittest.main()
