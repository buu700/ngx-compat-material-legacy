"""Owned motion evidence must survive independently specified corruption checks."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class OwnedMotionEvidenceTests(unittest.TestCase):
    def test_owned_constructor_roles_preserve_original_noop_and_reject_forged_or_missing_evidence(self):
        script = r"""
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {ownedSelectMotionProblems} from './scripts/api-owned-motion-context.mjs';
const proof=JSON.parse(readFileSync('compatibility/rc/constructor-motion-context-source-proof.json'));
const menuSuccessor=JSON.parse(readFileSync('compatibility/rc/menu-motion-packed-successor-v2.json'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(readFileSync('compatibility/rc/menu-motion-packed-successor-v2.json')),'f4158e053cbedcbe3ecace6416229232b923c27a180f85c25d65d012463e9fc8');
const integrationBytes=readFileSync('compatibility/rc/parent-main-common-module-surface-review-v1.json');
assert.equal(sha(integrationBytes),'54b03be88958c17a3dc7653b4e9ad4fef0fe4dac653fbf6b3f0317c7fd9fc6e6');
const integration=JSON.parse(integrationBytes);assert.ok(Object.values(integration.manifest.files).includes(menuSuccessor.artifact.sha256));
assert.equal(menuSuccessor.prior_f4_receipt.sha256,'83d0b7798b9d849a931c8a356fadb84324d8ac6f0a5da31d1001922752f27438');
assert.equal(sha(JSON.stringify(menuSuccessor.prior_f4_receipt.body_complete,null,2)+'\n'),menuSuccessor.prior_f4_receipt.sha256);
assert.equal(sha(readFileSync(menuSuccessor.historical_proof.path)),menuSuccessor.historical_proof.sha256);
for(const source of menuSuccessor.source_members)assert.equal(sha(readFileSync(source.path)),source.sha256);
assert.equal(sha(menuSuccessor.producer.exact_source),menuSuccessor.producer.source_sha256);
assert.equal(sha(menuSuccessor.producer.exact_raw_output),menuSuccessor.producer.raw_observation_sha256);
assert.deepEqual(JSON.parse(menuSuccessor.producer.exact_raw_output).observation,menuSuccessor.observation);
assert.equal(menuSuccessor.artifact.sha256,'2828f71233d13791de86971a6d18bdc35d88d8285a9c0ed30ad624a8dff9fbe1');
let rejected=0;
for(const control of proof.default_constructor_motion_contexts){
 const id=control.symbol_id,isMenu=id==='legacy-menu/primary/MatLegacyMenu';
 if(isMenu)assert.ok(ownedSelectMotionProblems(control.evidence,id).length,'historical menu receipt must remain rejected');
 const observation=isMenu?menuSuccessor.observation:control.evidence;
 assert.deepEqual(ownedSelectMotionProblems(observation,id),[]);
 for(const change of [x=>delete x.constructor_owner,x=>x.constructor_owner[isMenu?'public_subclass_export':'public_export']='Foreign',x=>x.constructor_owner.depth++,x=>x.constructor_owner.owned_class_identity_matched=false,x=>x.constructor_owner.extra='waiver',x=>x.caller.file='foreign',x=>x.sources.caller.file='foreign',x=>x.component_enabled=!x.component_enabled,x=>x.requests[0].self=true,x=>x.control_requests[0].identity_matched=false,x=>x.cases.pop()]){
  const bad=structuredClone(observation);change(bad);assert.ok(ownedSelectMotionProblems(bad,id).length);rejected++;
 }
 if(observation.constructor_animation_mode)for(const change of [x=>delete x.constructor_animation_mode,x=>x.constructor_animation_mode.original_parameter_index++,x=>x.constructor_animation_mode.original_constructor_arity++,x=>x.constructor_animation_mode.optional=false,x=>x.constructor_animation_mode.actual_input_identical=false,x=>x.constructor_animation_mode.constructor_calls=0,x=>x.constructor_animation_mode.mode_was_noop=true,x=>x.constructor_animation_mode.extra='waiver']){
  const bad=structuredClone(observation);change(bad);assert.ok(ownedSelectMotionProblems(bad,id).length);rejected++;
 }
}
assert.equal(rejected,49);
for(const symbol of ['legacy-form-field/primary/MatLegacyFormField','legacy-tooltip/primary/LegacyTooltipComponent']){
 const mixed=proof.original_noop_conflict_contexts.find(c=>c.symbol_id===symbol).evidence;
 assert.equal(mixed.state,'enabled');assert.equal(mixed.constructor_animation_mode.mode_was_noop,true);assert.equal(mixed.component_enabled,false);
 assert.deepEqual(ownedSelectMotionProblems(mixed,symbol),[]);
 const bad=structuredClone(mixed);bad.constructor_animation_mode.mode_was_noop=false;assert.ok(ownedSelectMotionProblems(bad,symbol).length);
}
assert.equal(proof.manual_constructor_observations.length,6);assert.ok(proof.manual_constructor_observations.every(x=>x.outcome==='returned'));
assert.equal(proof.manual_motion_lifecycle.length,4);
"""
        result = subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT,
                                capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_snack_profile_uses_actual_component_modes_and_rejects_changed_or_foreign_caller_evidence(self):
        script = r"""
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {SNACK_MOTION_SYMBOL,ownedSelectMotionProblems,ownedMotionProfile} from './scripts/api-owned-motion-context.mjs';
const proof=JSON.parse(readFileSync('compatibility/rc/caller-config-context-source-proof.json'));
const observation=proof.snack_default_motion_context;
assert.deepEqual(ownedSelectMotionProblems(observation,SNACK_MOTION_SYMBOL),[]);
assert.equal(ownedMotionProfile(SNACK_MOTION_SYMBOL).property,'_animationsEnabled');
assert.equal(observation.cases.length,9);
assert.deepEqual(proof.snack_motion_component_modes.map(c=>[c.id,c.enabled]),[
 ['default-server-enabled',true],['override-enabled',true],['override-disabled',false],['override-reduced',false],['material-disabled',false],['noop-module',false],
]);
for(const change of [x=>x.symbol_id='foreign',x=>x.verified=false,x=>x.sources.caller.file='foreign',x=>x.caller.file='foreign',x=>x.sources.state.sha256='',x=>x.classified_requests++,x=>x.requests[0].identity_matched=false,x=>x.requests[0].optional=false,x=>x.control_requests[0].self=true,x=>x.component_enabled=!x.component_enabled,x=>x.cases.pop(),x=>x.cases.reverse(),x=>x.cases[6].queries=['screen'],x=>x.cases[6].disabled_queries=['screen'],x=>x.cases[6].disabled_requests=[]]){
 const bad=structuredClone(observation);change(bad);assert.ok(ownedSelectMotionProblems(bad,SNACK_MOTION_SYMBOL).length);
}
const other=JSON.parse(readFileSync('compatibility/rc/api-remaining-attribute-families-source-proof.json')).families.find(f=>f.family==='legacy-select').constructor_observations[0].owned_motion_context;
const forged=structuredClone(other);forged.symbol_id=SNACK_MOTION_SYMBOL;
assert.ok(ownedSelectMotionProblems(forged,SNACK_MOTION_SYMBOL).length,'foreign constructor proof cannot qualify snack-bar');
"""
        result = subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT,
                                capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_pseudo_profile_keeps_original_dependency_and_rejects_unknown_or_select_scope(self):
        script = r"""
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {PSEUDO_MOTION_SYMBOL,ownedSelectMotionProblems,ownedMotionProfile} from './scripts/api-owned-motion-context.mjs';
const proof=JSON.parse(readFileSync('compatibility/rc/pseudo-checkbox-construction-source-proof.json'));
const value=proof.pseudo_constructor;
assert.equal(value.original_parameters.length,1);
assert.equal(value.original_parameters[0].ident,'ANIMATION_MODULE_TYPE');
assert.equal(value.requests.length,1);
assert.equal(value.requests[0].identity_matched,true);
assert.equal(value.requests[0].optional,true);
assert.deepEqual(ownedSelectMotionProblems(value.owned_motion_context,PSEUDO_MOTION_SYMBOL),[]);
assert.ok(ownedSelectMotionProblems(value.owned_motion_context).length);
assert.ok(ownedSelectMotionProblems(value.owned_motion_context,'legacy-core/primary/unreviewed').length);
assert.equal(ownedMotionProfile('__proto__'),null);
assert.equal(ownedMotionProfile('constructor'),null);
assert.equal(Object.isFrozen(ownedMotionProfile(PSEUDO_MOTION_SYMBOL)),true);
assert.throws(()=>{ownedMotionProfile(PSEUDO_MOTION_SYMBOL).property='unknown';},TypeError);
const wrong=structuredClone(value.owned_motion_context);wrong.component_enabled=!wrong.component_enabled;
assert.ok(ownedSelectMotionProblems(wrong,PSEUDO_MOTION_SYMBOL).length);
"""
        result = subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT,
                                capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_recorded_execution_and_rejection_of_incomplete_or_changed_contracts(self):
        script = r"""
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ownedSelectMotionProblems} from './scripts/api-owned-motion-context.mjs';
const proof=JSON.parse(readFileSync('compatibility/rc/api-remaining-attribute-families-source-proof.json'));
const observation=proof.families.find(f=>f.family==='legacy-select').constructor_observations[0].owned_motion_context;
assert.deepEqual(ownedSelectMotionProblems(observation),[]);
assert.equal(observation.cases.length,9);
assert.equal(observation.cases.find(c=>c.id==='material-disabled').disabled,true);
assert.equal(observation.cases.find(c=>c.id==='media-missing').state,'enabled');
for(const mutate of [
 x=>x.sources.state.sha256='',
 x=>x.sources.disabled.function_text_sha256='',
 x=>x.caller=null,
 x=>x.classified_requests++,
 x=>x.verified=false,
 x=>x.requests[0].identity_matched=false,
 x=>x.control_requests[0].optional=false,
 x=>x.requests[0].unresolved=true,
 x=>x.component_enabled=!x.component_enabled,
 x=>x.cases[3].state='enabled',
 x=>x.cases[3].disabled=false,
 x=>x.cases[8].requests[3].unresolved=false,
 x=>x.cases[6].queries=['screen'],
 x=>x.cases[6].disabled_queries=['screen'],
 x=>x.cases[6].disabled_requests=[],
 x=>x.cases.pop(),
 x=>x.cases.reverse(),
]){
 const changed=structuredClone(observation);mutate(changed);
 assert.ok(ownedSelectMotionProblems(changed).length,'Changed evidence admitted');
}
assert.ok(ownedSelectMotionProblems(null).length);
"""
        result = subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT,
                                capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
