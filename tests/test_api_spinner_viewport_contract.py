"""The owned spinner viewport is a finite replacement, not historic token identity."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

class SpinnerViewportReceiptTests(unittest.TestCase):
    def test_receipt_and_forgery_controls(self):
        code = r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spinnerViewportObservationProblems} from './scripts/api-spinner-viewport-contract.mjs';
const row=JSON.parse(readFileSync('tests/fixtures/api-spinner-viewport-qualified.json'))[0];
assert.deepEqual(spinnerViewportObservationProblems(row),[]);
for(const [path,value] of [['runtime_requests.6.identity_matched',true],['runtime_requests.6.intentional_token_difference.proof.artifact_sha256','0'.repeat(64)],['runtime_requests.6.intentional_token_difference.node.actual_node_element',false],['runtime_requests.6.intentional_token_difference.historical_provider_selects_actual',true],['runtime_requests.6.intentional_token_difference.minimum_provider_selects_actual',true],['runtime_requests.6.intentional_token_difference.proof.program_sources',308],['runtime_requests.6.intentional_token_difference.proof.program_closure_sha256','f'.repeat(64)],['runtime_requests.6.optional',true],['runtime_requests.5.identity_matched',false],['factory_node_kind','template'],['factory_outcome','threw'],['factory_returned_owned_instance',false]]){
 const x=structuredClone(row),parts=path.split('.'),last=parts.pop(),parent=parts.reduce((a,k)=>a[k],x);parent[last]=value;
 assert.notDeepEqual(spinnerViewportObservationProblems(x),[],path);
}
'''
        result = subprocess.run(['node', '--input-type=module', '-e', code], cwd=ROOT,
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
