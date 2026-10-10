# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Reject a shown panel that lost the historical trigger-relative font/option height."""
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class LegacySelectFontNativeContractTests(unittest.TestCase):
    def test_missing_fonts_stale_defaults_and_wrong_geometry_fail(self):
        subprocess.run(['node', '--input-type=module', '-e', r'''
import assert from 'node:assert/strict';
import {legacySelectFontNativeOkay as okay} from './scripts/legacy-select-font-native-contract.mjs';
const o={panel_count:1,option_count:1,historical_panel:true,historical_option:true,trigger_font:'20px',pane_inline_font:'20px',panel_font:'20px',option_font:'20px',option_height:60};
assert.equal(okay(o),true);assert.equal(okay(null),false);
for(const key of Object.keys(o)){const missing={...o};delete missing[key];assert.equal(okay(missing),false,key);}
for(const key of ['trigger_font','pane_inline_font','panel_font','option_font'])for(const value of ['', '14px','16px',20])assert.equal(okay({...o,[key]:value}),false,key);
for(const key of ['panel_count','option_count'])for(const value of [0,2,'1'])assert.equal(okay({...o,[key]:value}),false,key);
for(const key of ['historical_panel','historical_option'])for(const value of [false,'true'])assert.equal(okay({...o,[key]:value}),false,key);
for(const value of [0,48,58,62,NaN,Infinity,'60'])assert.equal(okay({...o,option_height:value}),false);
assert.equal(okay({...o,error:'render failed'}),false);
'''], cwd=ROOT, check=True, capture_output=True, text=True)
