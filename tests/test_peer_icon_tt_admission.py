"""Native icon TT receipt requires actual enforcement and both policy negatives."""
from pathlib import Path
import subprocess,unittest
ROOT=Path(__file__).resolve().parents[1]
class PeerIconTtAdmission(unittest.TestCase):
    def test_flags_and_native_negative_directives_are_required(self):
        code=r"""
import assert from 'node:assert/strict';
import {peerIconTtOkay,PEER_ICON_TT_CSP} from './scripts/peer-icon-tt-admission.mjs';
assert.ok(PEER_ICON_TT_CSP.includes("require-trusted-types-for 'script'"));
const flags=['available','svg_rendered','positive_without_violations','raw_literal_rejected','disallowed_policy_rejected','negative_directives_observed'];
const good={...Object.fromEntries(flags.map(key=>[key,true])),observed_negative_directives:['require-trusted-types-for','trusted-types']};
assert.equal(peerIconTtOkay(good),true);
for(const key of flags){
 for(const value of [false,null,1,'true'])assert.equal(peerIconTtOkay({...good,[key]:value}),false);
 const omitted={...good};delete omitted[key];assert.equal(peerIconTtOkay(omitted),false);
}
for(const value of [null,undefined,[],['trusted-types'],['require-trusted-types-for'],['trusted-types','require-trusted-types-for','script-src']])
 assert.equal(peerIconTtOkay({...good,observed_negative_directives:value}),false);
for(const value of [null,undefined,[],{}])assert.equal(peerIconTtOkay(value),false);
"""
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr or result.stdout)
