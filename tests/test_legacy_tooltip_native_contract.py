# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Reject missing, stale and incorrectly positioned native tooltip observations."""
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class LegacyTooltipNativeContractTests(unittest.TestCase):
    def test_missing_or_failed_aria_cleanup_observations_fail(self):
        subprocess.run(['node', '--input-type=module', '-e', r'''
import assert from 'node:assert/strict';
import {legacyTooltipAriaLifetimeNativeOkay as okay} from './scripts/legacy-tooltip-native-contract.mjs';
const observation={actual_directive_created:true,host_removed:true,initial_description_absent:true,
 pending_cleanup_clear:true,later_request_clear:true};
assert.equal(okay(observation),true);
for(const value of [null,{},[],{...observation,error:'browser failed'}])assert.equal(okay(value),false);
for(const key of Object.keys(observation)){
 const missing={...observation};delete missing[key];assert.equal(okay(missing),false,key);
 for(const value of [false,'true',1,undefined])assert.equal(okay({...observation,[key]:value}),false,key);
}
'''], cwd=ROOT, check=True, capture_output=True, text=True)

    def test_wrong_message_geometry_and_missing_observations_fail(self):
        subprocess.run(['node', '--input-type=module', '-e', r'''
import assert from 'node:assert/strict';
import {legacyTooltipNativeOkay as okay,legacyTooltipMessageSequenceOkay as sequence} from './scripts/legacy-tooltip-native-contract.mjs';
const first={count:1,historical_element:true,visible:true,text:'Hello tip',left:175,top:48,width:50,height:24,host_center:200,host_bottom:40,viewport_width:800,viewport_height:600};
const second={...first,text:'A longer tooltip message for repositioning',left:100,width:200};
assert.equal(okay(first,'Hello tip'),true);assert.equal(sequence([first,second]),true);
assert.equal(okay(null,'Hello tip'),false);assert.equal(sequence(null),false);
for(const key of Object.keys(first)){const missing={...first};delete missing[key];assert.equal(okay(missing,'Hello tip'),false,key);}
for(const [key,values]of [
 ['count',[0,2,'1']],['historical_element',[false,'true']],['visible',[false,'true']],['text',['','stale']],
 ['left',[-1,172,NaN,Infinity,'175']],['top',[39,73,NaN,Infinity]],['width',[0,40,NaN,Infinity]],
 ['height',[0,600,NaN,Infinity]],['host_center',[0,NaN,Infinity]],['host_bottom',[49,NaN,Infinity]],
 ['viewport_width',[200,NaN,Infinity]],['viewport_height',[60,NaN,Infinity]]
])for(const value of values)assert.equal(okay({...first,[key]:value},'Hello tip'),false,key);
assert.equal(okay({...first,error:'browser failed'},'Hello tip'),false);
for(const rows of [[],[first],[first,first],[second,first],[first,{...second,left:first.left}],
 [first,{...second,width:50,left:175}],[first,second,second]])assert.equal(sequence(rows),false);
'''], cwd=ROOT, check=True, capture_output=True, text=True)
