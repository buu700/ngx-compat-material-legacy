import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class ComponentHighContrastContractTest(unittest.TestCase):
    def test_required_phases_controls_and_negative_observations(self):
        subprocess.run(['node', '--input-type=module', '-e', r'''
import assert from 'node:assert/strict';
import {componentHighContrastOkay as okay} from './scripts/component-high-contrast-contract.mjs';
const flags={normal:[false,false],historical_class:[false,true],forced_colors:[true,false],combined:[true,true]};
const observation={};
for(const [key,[media_active,class_active]] of Object.entries(flags))observation[key]={found:true,media_active,class_active,values:key==='normal'?['1','0px','0px']:['0.5','1px','1px']};
for(const key of ['historical_class','forced_colors'])observation[key].negative={...observation[key],values:['0.8','7px','9px']};
assert.equal(okay(observation),true);assert.equal(okay(null),false);
const mutate=fn=>{const bad=structuredClone(observation);fn(bad);assert.equal(okay(bad),false);};
for(const key of Object.keys(flags)){
 mutate(o=>delete o[key]);mutate(o=>o[key].found=false);
 mutate(o=>o[key].media_active=!o[key].media_active);mutate(o=>o[key].class_active=!o[key].class_active);
 for(let index=0;index<3;index++)mutate(o=>o[key].values[index]='wrong');
}
for(const key of ['historical_class','forced_colors']){
 mutate(o=>delete o[key].negative);mutate(o=>o[key].negative.found=false);
 mutate(o=>o[key].negative.media_active=!o[key].negative.media_active);
 mutate(o=>o[key].negative.class_active=!o[key].negative.class_active);
 for(let index=0;index<3;index++)mutate(o=>o[key].negative.values[index]='wrong');
}
mutate(o=>o.error='browser failure');
'''], cwd=ROOT, check=True, timeout=20)
