/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {autocompleteLandscapeSourceJudgment,AUTOCOMPLETE_LANDSCAPE_SHA,AUTOCOMPLETE_LANDSCAPE_REVIEW} from '../scripts/autocomplete-landscape-source-judgment.mjs';
import {individualReviewScopeOk} from '../scripts/upstream-individual-evidence-scope.mjs';
import {candidateSourceEvidenceOk} from '../scripts/upstream-candidate-source-evidence.mjs';
import {requiresHistoricalBehavior,validateHistoricalBehavior} from '../scripts/upstream-historical-behavior-evidence.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p));
const source=autocompleteLandscapeSourceJudgment({root,read}),body=JSON.parse(read(AUTOCOMPLETE_LANDSCAPE_REVIEW));
assert.deepEqual(source.body,body);source.assertExternal();
const ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json'));
const entry=ledger.entries.find(row=>row.sha===AUTOCOMPLETE_LANDSCAPE_SHA);assert.ok(entry);
assert.equal(entry.final_disposition,'already-adapted');assert.equal(entry.evidence_report,AUTOCOMPLETE_LANDSCAPE_REVIEW);
assert.deepEqual(entry.individual_proof,source.proof);assert.equal(ledger.g11_claim,'not-passed');
assert.equal(individualReviewScopeOk({entry,proof:source.proof,body,review:body,requiresIndividual:true,claimsBehavior:true}),true);
assert.equal(candidateSourceEvidenceOk(source.proof,read,()=>[]),true);
assert.equal(requiresHistoricalBehavior({sha:entry.sha},{}),true);
const withoutRun=validateHistoricalBehavior({root,entry,proof:source.proof,request:{}});
assert.equal(withoutRun.ok,false);assert.equal(withoutRun.detail,'missing coordinator run');
assert.throws(()=>autocompleteLandscapeSourceJudgment({root,read,line:body.line==='main'?'21.x':'main'}));
assert.equal(body.required_named_native_cases.length,5);assert.equal(source.proof.historical_behavior.source_members.length,22);
assert.equal(body.actual_native_browser_artifact_or_floor_executed,false);
console.log(JSON.stringify({line:body.line,current_individual_source_proof_valid:true,exact_named_native_cases:5,
  exact_native_source_members:22,missing_coordinator_run_rejected:true,wrong_source_line_rejected:true,
  source_metadata_does_not_grant_native_or_G11_admission:true,actual_browser_artifact_or_floor_executed:false}));
