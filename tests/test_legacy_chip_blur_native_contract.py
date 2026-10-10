# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""A selected chip alone must not qualify focus and form blur behavior."""
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]


class LegacyChipBlurNativeContractTests(unittest.TestCase):
    def test_missing_or_wrong_focus_and_touched_states_fail(self):
        result = subprocess.run(['node','--input-type=module','-e',r'''
import assert from 'node:assert/strict';import {legacyChipBlurNativeOkay as okay} from './scripts/legacy-chip-blur-native-contract.mjs';
const good={focused_before:true,touched_before:false,focused_after:false,touched_after:true,dom_focus_moved:true};
assert.equal(okay(good),true);assert.equal(okay(null),false);
for(const field of Object.keys(good)){
 const missing={...good};delete missing[field];assert.equal(okay(missing),false);
 for(const value of [!good[field],String(good[field]),0,1])assert.equal(okay({...good,[field]:value}),false);
}
assert.equal(okay({...good,error:'blur timed out'}),false);
'''],cwd=ROOT,capture_output=True,text=True,timeout=20)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
