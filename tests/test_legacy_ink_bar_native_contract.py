# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Reject incomplete or wrong geometry; renderer observations are a separate gate."""
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class LegacyInkBarNativeContractTests(unittest.TestCase):
    def test_missing_stale_and_wrong_selection_observations_fail(self):
        subprocess.run(['node', '--input-type=module', '-e', r'''
import assert from 'node:assert/strict';
import {legacyInkBarNativeOkay as okay,legacyInkBarSelectionSequenceOkay as sequence} from './scripts/legacy-ink-bar-native-contract.mjs';
const first={ink_count:1,selected_count:1,historical_element:true,visible:true,selected_index:0,left:0,width:160,expected_left:0,expected_width:160};
const second={...first,selected_index:1,left:160,expected_left:160};
assert.equal(okay(first),true);assert.equal(sequence([first,second,first]),true);
assert.equal(okay(null),false);assert.equal(sequence(null),false);
for(const key of Object.keys(first)){const missing={...first};delete missing[key];assert.equal(okay(missing),false);}
for(const [key,values]of [
 ['ink_count',[0,2,'1']],['selected_count',[0,2,'1']],['historical_element',[false,'true']],
 ['visible',[false,'true']],['selected_index',[-1,0.5,'0']],['left',[1,NaN,Infinity,'0']],
 ['width',[0,159,NaN,Infinity,'160']],['expected_left',[1,NaN,Infinity]],['expected_width',[0,159,NaN,Infinity]]
])for(const value of values)assert.equal(okay({...first,[key]:value}),false,key);
assert.equal(okay({...first,error:'rendering failed'}),false);
for(const cells of [[],[first],[first,second],[first,first,first],[second,first,second],
 [first,{...second,left:0},first],[first,second,{...first,selected_index:1}]])assert.equal(sequence(cells),false);
'''], cwd=ROOT, check=True, timeout=20)
