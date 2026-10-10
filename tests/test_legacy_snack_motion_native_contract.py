# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Native observations must prove both enabled motion completion paths."""
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]


class LegacySnackMotionNativeContractTests(unittest.TestCase):
    def test_missing_mutated_or_synthetic_completion_is_rejected(self):
        result = subprocess.run(['node','--input-type=module','-e',r'''
import assert from 'node:assert/strict';
import {legacySnackMotionNativeOkay as okay} from './scripts/legacy-snack-motion-native-contract.mjs';
const good={mode:'event',enabled:true,entered:1,dismissed:1,completed:true,dismissed_by_action:true,
removed:true,trusted_enter_events:1,trusted_exit_events:1,enter_ms:160,exit_ms:80,enter_delivery:'event',exit_delivery:'event'};
const fallback={...good,mode:'fallback',enter_ms:200,exit_ms:125,enter_delivery:'fallback',exit_delivery:'fallback'};
assert.equal(okay(good),true);assert.equal(okay(fallback),true);
assert.equal(okay(null),false);
for(const field of Object.keys(good)){const bad={...good};delete bad[field];assert.equal(okay(bad),false,field);}
for(const field of ['enabled','completed','dismissed_by_action','removed'])for(const value of [false,'true'])assert.equal(okay({...good,[field]:value}),false);
for(const field of ['entered','dismissed'])for(const value of [0,2,'1'])assert.equal(okay({...good,[field]:value}),false);
for(const field of ['trusted_enter_events','trusted_exit_events'])for(const value of [0,2,'1'])assert.equal(okay({...good,[field]:value}),false);
for(const field of ['enter_ms','exit_ms'])for(const value of [undefined,-1,NaN,Infinity])assert.equal(okay({...good,[field]:value}),false);
assert.equal(okay({...good,mode:'disabled'}),false);assert.equal(okay({...good,error:'failed'}),false);
assert.equal(okay({...good,mode:'fallback'}),false);
assert.equal(okay({...good,mode:'fallback',enter_ms:200,exit_ms:100}),false);
for(const field of ['enter_delivery','exit_delivery']){
assert.equal(okay({...good,[field]:'fallback'}),false);assert.equal(okay({...good,[field]:'other'}),false);
assert.equal(okay({...fallback,[field]:'event'}),false);assert.equal(okay({...fallback,[field]:'none'}),false);
}
'''],cwd=ROOT,capture_output=True,text=True,timeout=20)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
