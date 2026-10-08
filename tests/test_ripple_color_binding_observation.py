"""Incomplete native evidence and ignored color tokens must fail the guard."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class RippleColorBindingTests(unittest.TestCase):
    def test_native_guard_requires_all_scopes_consumption_and_restoration(self):
        script=r"""
import assert from 'node:assert/strict';
import {RIPPLE_COLOR_CASES,rippleColorBindingOkay,observeRippleColorBinding} from './scripts/ripple-color-binding-observation.mjs';
const rows=Object.entries(RIPPLE_COLOR_CASES).map(([id,[background,opacity]])=>({id,background,opacity,
 shared_public_instance:true,connected:true,removed:true,position:'absolute',radius:'50%'}));
const good={shared_public_identity:true,public_styles_copied:1,baseline:structuredClone(rows),late_styles:structuredClone(rows),
 explicit_colors:rows.map(row=>({...row,background:'rgb(5, 6, 7)'})),restored:structuredClone(rows),
 negative:{root_background:'rgba(23, 24, 25, 0.73)',dark_background:RIPPLE_COLOR_CASES.dark[0]},
 remaining_elements:0,compiled_theme_css_sha256:'a'.repeat(64)};
assert.equal(rippleColorBindingOkay(good),true);assert.equal(rippleColorBindingOkay({}),false);
let mutants=0;
for(const key of ['baseline','late_styles','explicit_colors','restored']){
 for(let index=0;index<5;index++){
  for(const [field,value] of [['background','transparent'],['opacity','0.73'],['position','relative'],['radius','0px'],
   ['shared_public_instance',false],['connected',false],['removed',false],['id','unrelated']]){
   const bad=structuredClone(good);bad[key][index][field]=value;assert.equal(rippleColorBindingOkay(bad),false);mutants++;
  }
 }
 const bad=structuredClone(good);bad[key].pop();assert.equal(rippleColorBindingOkay(bad),false);mutants++;
}
for(const change of [x=>x.shared_public_identity=false,x=>x.public_styles_copied=0,x=>x.remaining_elements=1,
 x=>x.compiled_theme_css_sha256='',x=>x.negative.root_background=RIPPLE_COLOR_CASES.root[0],
 x=>x.negative.dark_background='rgba(23, 24, 25, 0.73)',x=>x.error='runtime failure']){
 const bad=structuredClone(good);change(bad);assert.equal(rippleColorBindingOkay(bad),false);mutants++;
}
assert.equal(mutants,171);
// Parse the exact expression sent to Chromium; do not execute a simulated DOM.
const observed=await observeRippleColorBinding({evaluate:async expression=>{new Function('return '+expression);return {};}});
assert.deepEqual(observed,{});
"""
        run=subprocess.run(['node','--input-type=module','-e',script],cwd=ROOT,capture_output=True,text=True,timeout=15)
        self.assertEqual(run.returncode,0,(run.stdout+run.stderr)[-5000:])
