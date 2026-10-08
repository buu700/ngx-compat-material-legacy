"""A state-token repair requires native values, a consumed negative, and restoration."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FormFieldStateStyleObservationTests(unittest.TestCase):
    def test_missing_wrong_and_unconsumed_native_observations_fail(self):
        code = r"""
import assert from 'node:assert/strict';
import {formFieldStateTokensOkay} from './scripts/form-field-state-style-observation.mjs';
const values=[['peer-form-hover','rgba(0, 0, 0, 0.87)','0.04','0.12'],['peer-form-hover-dark','rgba(255, 255, 255, 0.87)','0.08','0.24']];
const rows=values.map(([id,ink,hover,focus])=>{
 const state=(opacity,host,wrapper,focused,hoverValue=hover)=>({present:true,overlay_present:true,
   opacity,host_hovered:host,wrapper_hovered:wrapper,focused,background_color:ink,
   state_layer_color:ink,hover_token:hoverValue,focus_token:focus});
 return {id,baseline:state('0',false,false,false),wrapper:state(hover,true,true,false),
   hint:state(hover,true,false,false),focus:state(focus,false,false,true),
   negative:state('0.73',true,true,false,'0.73'),restored:state(hover,true,true,false)};
});
assert.equal(formFieldStateTokensOkay(rows),true);
// The old invalid-wrapper opacity and a missing dark lane must not qualify.
for(const wrong of [null,{},[],rows.slice(0,1),[rows[1],rows[0]],[...rows,rows[0]]])
 assert.equal(formFieldStateTokensOkay(wrong),false);
for(let i=0;i<rows.length;i++){
 for(const name of ['baseline','wrapper','hint','focus','negative','restored']){
  const missing=structuredClone(rows);delete missing[i][name];assert.equal(formFieldStateTokensOkay(missing),false);
  for(const [key,value]of [['opacity','1'],['background_color','transparent'],['state_layer_color','transparent'],
    ['hover_token',''],['focus_token',''],['present',false],['overlay_present',false]]){
   const wrong=structuredClone(rows);wrong[i][name][key]=value;assert.equal(formFieldStateTokensOkay(wrong),false,name+'/'+key);
  }
 }
 const unconsumed=structuredClone(rows);unconsumed[i].negative.opacity=rows[i].wrapper.opacity;
 assert.equal(formFieldStateTokensOkay(unconsumed),false);
 const unrestored=structuredClone(rows);unrestored[i].restored=unrestored[i].negative;
 assert.equal(formFieldStateTokensOkay(unrestored),false);
 const hintWrong=structuredClone(rows);hintWrong[i].hint.wrapper_hovered=true;
 assert.equal(formFieldStateTokensOkay(hintWrong),false);
}
"""
        result = subprocess.run(['node', '--input-type=module', '-e', code], cwd=ROOT,
            capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
