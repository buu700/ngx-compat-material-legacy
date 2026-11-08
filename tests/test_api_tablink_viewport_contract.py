"""Tab-link parent viewport receipts name the deliberate token replacement."""
from pathlib import Path
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class TabLinkViewportTests(unittest.TestCase):
    def test_parent_receipts_and_forgery_controls(self):
        code = r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {tablinkViewportObservationProblems} from './scripts/api-tablink-viewport-contract.mjs';
const rows=JSON.parse(readFileSync('tests/fixtures/api-tablink-viewport-qualified.json'));assert.equal(rows.length,2);for(const row of rows){assert.deepEqual(tablinkViewportObservationProblems(row),[]);for(const [path,v] of [['factory_parent_construction.viewport_replacement.identity_matched',true],['factory_parent_construction.viewport_replacement.proof.bundle_sha256','f'.repeat(64)],['factory_parent_construction.viewport_replacement.proof.source.selected_local','Wrong'],['factory_parent_construction.viewport_replacement.historical16_provider_selects_actual',true],['factory_parent_construction.viewport_replacement.minimum22_provider_selects_actual',true],['factory_parent_construction.viewport_replacement.node.parent_node',false],['factory_parent_construction.compiler_observation.parameters.4.token_expression','fake'],['factory_parent_construction.constructor_evidence.4.input_verified',false],['factory_node_kind','template'],['runtime_requests.1.identity_matched',false]]){let x=structuredClone(row),p=path.split('.'),k=p.pop(),parent=p.reduce((o,v)=>o[v],x);parent[k]=v;assert.notDeepEqual(tablinkViewportObservationProblems(x),[],path);}}
'''
        run=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(run.returncode,0,run.stderr or run.stdout)
