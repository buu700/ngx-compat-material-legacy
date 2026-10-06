"""Wrong nonempty styles, missing elements and borrowed receipts cannot pass."""
import copy
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from owned_rendered_admission import owned_schema,owned_rendered_ok
from owned_style_fixture import style_receipt

class OwnedRenderedStylesTests(unittest.TestCase):
    def test_assessment_rejects_wrong_values_and_inert_mutation(self):
        code=r'''
import assert from 'node:assert/strict';
import {OWNED_STYLE_PROBES, assessOwnedStyles} from './scripts/sass-owned-rendered.mjs';
const reference=Object.fromEntries(Object.entries(OWNED_STYLE_PROBES).map(([id,p])=>[id,{found:true,values:Object.fromEntries(p.properties.map(k=>[k,'tagged-value']))}]));
const negative=structuredClone(reference);
for(const [id,p] of Object.entries(OWNED_STYLE_PROBES)){const property=p.properties.includes('line-height')?'line-height':p.properties[0];negative[id].values[property]='wrong-but-nonempty';}
assert.ok(Object.values(assessOwnedStyles(reference,reference,negative)).every(r=>r.result==='pass'));
for(const [id,p] of Object.entries(OWNED_STYLE_PROBES)){
 const bad=structuredClone(reference);bad[id].values[p.properties[0]]='unrelated-wrong-value';
 const failed=Object.entries(assessOwnedStyles(reference,bad,negative)).filter(([,r])=>r.result==='fail').map(([id])=>id);
 assert.deepEqual(failed,[id]);
 bad[id]={found:false,values:{}};assert.equal(assessOwnedStyles(reference,bad,negative)[id].result,'fail');
}
assert.ok(Object.values(assessOwnedStyles(reference,reference,reference)).every(r=>r.result==='fail'));
for(const id of Object.keys(negative)){const inert=structuredClone(negative);inert[id]=structuredClone(reference[id]);assert.equal(assessOwnedStyles(reference,reference,inert)[id].result,'fail');}
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)

    def test_receipts_bind_both_lines_reference_bytes_and_properties(self):
        for line in ('main','21.x'):
            version='22.1.7' if line=='main' else '21.2.14'
            active=SimpleNamespace(binding={'source_line':line},manifest={'run_id':'synthetic','artifacts':[{'id':'library','sha256':'d'*64}],'oracles':{'current_peer':[{'id':'@angular/material','version':version},{'id':'@angular/cdk','version':version},{'id':'@angular/core','version':'22.1.7' if line=='main' else '21.2.23'}]}})
            for case in owned_schema():
                body=style_receipt(ROOT,active,case,'one')
                self.assertTrue(owned_rendered_ok(ROOT,active,body,'one'),case)
                for field,value in [('source_kind','workspace'),('line','foreign'),('tarball_sha256','a'*64),('binding',{}),('properties',[]),('found',False),('mutation_detected',False),('skip_lib_check',True)]:
                    bad=copy.deepcopy(body);bad[field]=value;self.assertFalse(owned_rendered_ok(ROOT,active,bad,'one'),(case,field))
                bad=copy.deepcopy(body);bad['properties'][0]['candidate']='wrong-value';self.assertFalse(owned_rendered_ok(ROOT,active,bad,'one'))
                bad=copy.deepcopy(body);bad['identities']['owned-legacy-select']['reference_sha256']='f'*64;self.assertFalse(owned_rendered_ok(ROOT,active,bad,'one'))
                bad=copy.deepcopy(body);bad['mutation']['observed']=bad['mutation']['reference'];self.assertFalse(owned_rendered_ok(ROOT,active,bad,'one'))
