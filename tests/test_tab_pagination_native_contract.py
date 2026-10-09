import subprocess
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
class TabPaginationNativeContractTest(unittest.TestCase):
    def test_partial_or_mutated_renderer_observations_fail(self):
        subprocess.run(['node','--input-type=module','-e',r'''
import assert from 'node:assert/strict';import {tabPaginationNativeOkay as okay} from './scripts/tab-pagination-native-contract.mjs';
const good={elements:2,button_semantics:true,disabled_click_inert:true,pointer_focus_retained:true,scroll_before:0,scroll_after:-48};assert.equal(okay(good),true);assert.equal(okay(null),false);
for(const field of Object.keys(good)){const bad={...good};delete bad[field];assert.equal(okay(bad),false);}
for(const [field,values]of [['elements',[0,1,3]],['button_semantics',[false,'true']],['disabled_click_inert',[false,'true']],['pointer_focus_retained',[false,'true']],['scroll_before',[-1,1,NaN,Infinity]],['scroll_after',[0,1,NaN,Infinity]]])for(const value of values)assert.equal(okay({...good,[field]:value}),false);
assert.equal(okay({...good,error:'native click failed'}),false);
'''],cwd=ROOT,check=True,timeout=20)
