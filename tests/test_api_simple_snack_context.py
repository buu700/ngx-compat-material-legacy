"""Simple snack factories need original metadata and genuine caller/action/lifetime evidence."""
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).resolve().parents[1]
class SimpleSnackContextTests(unittest.TestCase):
    def test_original_profile_and_required_caller_action_lifetime_receipt(self):
        code=r'''
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {originalFactoryContract} from './scripts/api-surface.mjs';import {originalCompilerFactoryContext} from './scripts/api-original-factory-contexts.mjs';
import {SIMPLE_SNACK_SYMBOL,simpleSnackProfile,simpleSnackObservationProblems} from './scripts/api-simple-snack-context.mjs';
const originalFactory=originalFactoryContract('/original/src/material/legacy-snack-bar/simple-snack-bar.ts','LegacySimpleSnackBar');
const symbol={symbol_id:SIMPLE_SNACK_SYMBOL,family:'legacy-snack-bar',kind:'primary',name:'LegacySimpleSnackBar',shape:{originalFactory,originalFactoryContext:originalCompilerFactoryContext(originalFactory)}};
assert.equal(simpleSnackProfile(symbol).constructor_arity,2);let rejected=0;
for(const change of [x=>x.family='foreign',x=>x.kind='testing',x=>x.name='Foreign',x=>x.shape.originalFactory.declaration+=' ',x=>x.shape.originalFactoryContext.parameter_factory_key='foreign',x=>x.shape.originalFactoryContext.factory_parameters[0].optional=true,x=>x.shape.originalFactoryContext.factory_parameters[1].imported='Foreign',x=>x.shape.originalFactoryContext.factory_parameters.pop(),x=>x.shape.originalFactoryContext.source_sha256='0'.repeat(64)]){
 const bad=structuredClone(symbol);change(bad);assert.throws(()=>simpleSnackProfile(bad));rejected++;
}
assert.equal(rejected,9);for(const id of ['foreign','constructor','__proto__'])assert.equal(simpleSnackProfile({symbol_id:id}),null);
const proof=JSON.parse(readFileSync('compatibility/rc/simple-snack-caller-context-source-proof.json'));
const row={symbol,factory_outcome:'returned',factory_simple_snack_context:proof.simple_snack_controls[0].evidence};assert.deepEqual(simpleSnackObservationProblems(row),[]);rejected=0;
const changeEvidence=change=>{const bad=structuredClone(row);change(bad.factory_simple_snack_context);assert.ok(simpleSnackObservationProblems(bad).length);rejected++;};
for(const field of ['owned_reference_instance','genuine_angular_container','genuine_public_overlay','constructor_ref_data_identical','parent_self_providers_identical','child_ancestor_providers_identical','child_self_providers_absent','has_action_true_false_true','fixture_motion_disabled','borrowed_context_alive_after_owned_teardown','caller_data_unchanged_after_owned_teardown','caller_overlay_alive_after_owned_teardown','action_disposed_caller_overlay','action_exit_state_and_attribute'])changeEvidence(x=>x[field]=false);
for(const field of ['constructor_calls','constructor_arity','action_events'])changeEvidence(x=>x[field]++);
for(const field of ['symbol_id','parameter_factory_key','original_source_sha256'])changeEvidence(x=>x.profile[field]='foreign');
changeEvidence(x=>x.profile.constructor_arity++);changeEvidence(x=>x.profile.extra='waiver');
changeEvidence(x=>x.dismissals.pop());changeEvidence(x=>x.dismissals[0].dismissedByAction=false);changeEvidence(x=>x.dismissals[0].extra='waiver');changeEvidence(x=>x.extra='waiver');
for(const change of [x=>delete x.factory_simple_snack_context,x=>x.factory_outcome='threw']){const bad=structuredClone(row);change(bad);assert.ok(simpleSnackObservationProblems(bad).length);rejected++;}
assert.equal(rejected,28);assert.equal(proof.simple_snack_controls.length,9);
'''
        result=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,capture_output=True,text=True,timeout=10)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-5000:])
