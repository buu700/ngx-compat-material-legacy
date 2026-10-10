# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Reject visible-looking outlines with missing or stale historical gap geometry."""
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class LegacyFormFieldOutlineNativeContractTests(unittest.TestCase):
    def test_missing_stale_and_wrong_sequence_observations_fail(self):
        subprocess.run(['node', '--input-type=module', '-e', r'''
import assert from 'node:assert/strict';
import {legacyFormFieldOutlineNativeOkay as okay,legacyFormFieldOutlineSequenceOkay as sequence,legacyFormFieldOutlineBoundaryNativeOkay as boundary} from './scripts/legacy-form-field-outline-native-contract.mjs';
const first={visible:true,historical_host:true,direction:'ltr',label_children:1,container_width:200,expected_start:15,expected_gap:70,start_widths:[15,15],gap_widths:[70,70]};
const prefix={...first,expected_start:45,start_widths:[45,45]},rtl={...first,direction:'rtl'};
const fixed={...first,container_width:200,expected_gap:490,gap_widths:[490,490],fixed_host:true,null_offset_parent:true,document_root:true,prefix:true,suffix:true};
assert.equal(boundary(fixed),true);assert.equal(boundary(null),false);
for(const key of ['fixed_host','null_offset_parent','document_root','prefix','suffix']){const missing={...fixed};delete missing[key];assert.equal(boundary(missing),false);assert.equal(boundary({...fixed,[key]:false}),false);}
assert.equal(boundary({...fixed,expected_gap:70,gap_widths:[70,70]}),false);assert.equal(boundary({...fixed,gap_widths:[140,140]}),false);
assert.equal(okay(first),true);assert.equal(sequence([first,prefix,first,rtl]),true);
assert.equal(okay(null),false);assert.equal(sequence(null),false);
for(const key of Object.keys(first)){const missing={...first};delete missing[key];assert.equal(okay(missing),false,key);}
for(const key of ['visible','historical_host'])for(const value of [false,'true'])assert.equal(okay({...first,[key]:value}),false,key);
for(const key of ['start_widths','gap_widths'])for(const value of [[],[15],[15,15,15],[NaN,NaN],[0,0],['15','15']])assert.equal(okay({...first,[key]:value}),false,key);
for(const key of ['container_width','expected_gap'])for(const value of [0,NaN,Infinity,'200'])assert.equal(okay({...first,[key]:value}),false,key);
assert.equal(okay({...first,label_children:0}),false);assert.equal(okay({...first,direction:'auto'}),false);assert.equal(okay({...first,error:'browser failed'}),false);
for(const rows of [[],[first,prefix,first],[first,first,first,rtl],[first,prefix,prefix,rtl],[first,prefix,first,first]])assert.equal(sequence(rows),false);
'''], cwd=ROOT, check=True, capture_output=True, text=True)
