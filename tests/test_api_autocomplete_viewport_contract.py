"""Autocomplete viewport evidence is a distinct, finite replacement."""
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class AutocompleteViewportTests(unittest.TestCase):
    def test_receipt_and_forgery_controls(self):
        code = r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {autocompleteViewportObservationProblems} from './scripts/api-autocomplete-viewport-contract.mjs';
let r=JSON.parse(readFileSync('tests/fixtures/api-autocomplete-viewport-qualified.json'))[0];assert.deepEqual(autocompleteViewportObservationProblems(r),[]);
for(const [path,v] of [['runtime_requests.9.identity_matched',true],['runtime_requests.9.intentional_token_difference.proof.bundle_sha256','f'.repeat(64)],['runtime_requests.9.intentional_token_difference.proof.common','f'.repeat(64)],['runtime_requests.9.intentional_token_difference.historical16_provider_selects_actual',true],['runtime_requests.9.intentional_token_difference.minimum22_provider_selects_actual',true],['runtime_requests.9.intentional_token_difference.node.actual_node_element',false],['runtime_requests.9.optional',true],['runtime_requests.2.identity_matched',false],['factory_autocomplete_context.source.owner_text_sha256','f'.repeat(64)],['factory_node_kind','template']]){let x=structuredClone(r),p=path.split('.'),k=p.pop(),parent=p.reduce((o,v)=>o[v],x);parent[k]=v;assert.notDeepEqual(autocompleteViewportObservationProblems(x),[],path);}
'''
        run=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(run.returncode,0,run.stderr or run.stdout)
