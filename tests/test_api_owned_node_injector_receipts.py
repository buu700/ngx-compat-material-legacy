# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Recorded execution observations exercise settlement without a packed fixture."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class OwnedNodeInjectorReceiptTests(unittest.TestCase):
    def test_actual_receipts_and_corruption_controls(self):
        code = r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {settleDi} from './scripts/api-completeness.mjs';
const raw=readFileSync('compatibility/rc/api-owned-node-injector-observations-v1.json');
assert.equal(createHash('sha256').update(raw).digest('hex'),'c6689c5d133614196216013f417b707d602deb89a4b1f3ddc9a144adca9d7ac7');
const rows=JSON.parse(raw).rows;assert.equal(rows.length,2);
const records=JSON.parse(readFileSync('compatibility/rc/api/di-differences.json')).differences||[];
for(const row of rows){
 assert.equal(settleDi(row,records).result,'pass');
 const mutations=[['factory_outcome','threw'],['factory_returned_owned_instance',false],['factory_node_kind','template'],['factory_context_modules',[]],
 ['factory_owned_node_injector_context',null],['factory_owned_node_injector_context.artifact_sha256','0'.repeat(64)],
 ['factory_owned_node_injector_context.stored_input_identical',false],['factory_owned_node_injector_context.parent_scope_distinct',false],
 ['factory_owned_node_injector_context.parameter.token_expression','@angular/core#ElementRef'],['factory_owned_node_injector_context.parameter.optional',true],
 ['runtime_requests.1.identity_matched',false],['runtime_requests.1.observation_evidence','matching name/count list'],['factory_constructor_evidence.0.input_verified',false]];
 if(row.symbol.family==='legacy-select')mutations.push(['runtime_requests.0.identity_matched',true],['runtime_requests.0.intentional_token_difference',null],['runtime_requests.0.intentional_token_difference.proof.common','0'.repeat(64)],['runtime_requests.0.intentional_token_difference.node.stored_input_matches',false]);
 else mutations.push(['factory_owned_motion_context.constructor_animation_mode.original_constructor_arity',8],['factory_owned_motion_context.constructor_animation_mode.original_parameter_index',7]);
 for(const [path,value]of mutations){const changed=structuredClone(row),parts=path.split('.'),last=parts.pop();parts.reduce((object,key)=>object[key],changed)[last]=value;assert.notEqual(settleDi(changed,records).result,'pass',row.symbol.symbol_id+': '+path);}
 const extra=structuredClone(row);extra.factory_compiler_observation.parameters.push({...extra.factory_compiler_observation.parameters.at(-1)});assert.notEqual(settleDi(extra,records).result,'pass','unreviewed extra constructor parameter');
}
'''
        child = subprocess.run(['node', '--input-type=module', '-e', code], cwd=ROOT,
                               capture_output=True, text=True, timeout=45)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-5000:])
