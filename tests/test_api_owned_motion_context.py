"""Owned motion evidence must survive independently specified corruption checks."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class OwnedMotionEvidenceTests(unittest.TestCase):
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
