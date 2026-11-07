/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * MIT license; see LICENSE.
 */
// Synthetic contract corruption tests; these do not qualify a product run.
import assert from 'node:assert/strict';
import {TYPEAHEAD_CASES, TYPEAHEAD_SHA, typeaheadBehaviorRequirements, validateTypeaheadResults} from '../scripts/upstream-typeahead-evidence.mjs';
import {validateInheritedExecution} from '../scripts/upstream-inherited-execution-evidence.mjs';
const totals = {executed:496,passed:9,failed:0,skipped:487};
const selected = TYPEAHEAD_CASES.map(full_name => ({full_name, success:true, skipped:false}));
const sample = {subject_mode:'artifact', mode:'normal', run_id:'synthetic', artifact_sha256:'a'.repeat(64), totals,
 specs:[...selected, ...Array.from({length:487}, (_, i) => ({full_name:`excluded ${i}`, skipped:true}))], failures:[]};
const observation = {selected_cases:structuredClone(selected), counts:structuredClone(totals)};
const check = (raw, obs=observation) => validateTypeaheadResults(raw, 'synthetic', 'a'.repeat(64), obs);
check(sample);
for (const mutate of [
 x => x.specs[9].skipped=undefined,
 x => x.specs[0].success=false,
 x => x.specs[0].skipped=true,
 x => x.specs[0].full_name='unrelated passing case',
 x => x.specs[9].full_name=TYPEAHEAD_CASES[0],
 x => x.artifact_sha256='b'.repeat(64),
 x => x.run_id='other',
 x => x.failures.push('failure'),
 x => x.totals.skipped=486,
]) {const changed=structuredClone(sample); mutate(changed); assert.throws(()=>check(changed));}
assert.throws(()=>check(sample,{...observation, selected_cases:[]}));
assert.equal(typeaheadBehaviorRequirements(TYPEAHEAD_SHA,'21.x'),null);
assert.equal(typeaheadBehaviorRequirements('f'.repeat(40),'main'),null);
assert.equal(typeaheadBehaviorRequirements(TYPEAHEAD_SHA,'main').case_ids.length,9);
assert.equal(validateInheritedExecution({root:process.cwd(),entry:{sha:TYPEAHEAD_SHA},proof:{},line:'main'}).ok,false);
assert.equal(validateInheritedExecution({root:process.cwd(),entry:{sha:TYPEAHEAD_SHA},proof:{},line:'21.x'}).ok,false);
console.log('Synthetic typeahead result contract corruption checks passed.');
