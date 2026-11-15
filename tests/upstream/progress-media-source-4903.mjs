/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {buildProgressMediaSource4903,verifyProgressMediaSource4903} from '../../scripts/progress-media-source-4903.mjs';
const root=process.cwd(),read=p=>readFileSync(resolve(root,p));const x=await verifyProgressMediaSource4903({root,read});
assert.equal(x.entries.size,3);assert.equal(x.input.reviewed_changes.length,13);assert.equal(x.actual_native_packed_or_floor_qualified,false);assert.equal(x.g11_claim,'not-passed');
for(const [path,expected] of x.writes)assert.deepEqual(read(path),expected,'generated output changed '+path);
const original=JSON.parse(read(x.input.ledger_path)),prior=JSON.parse((await import('node:child_process')).execFileSync('git',['show',x.input.source_parent+':'+x.input.ledger_path],{cwd:root,maxBuffer:20*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}}));
for(const old of x.input.prior_entries){assert.equal(original.entries.filter(r=>r.sha===old.sha).length,1);assert.deepEqual(prior.entries.find(r=>r.sha===old.sha),old);}
// A real unrelated row can change while this transition is pending. The source
// formatter must leave every byte outside selected JSON object spans untouched.
const unrelated=prior.entries.find(r=>!x.entries.has(r.sha));
const marker='\n      "sha": "'+unrelated.sha+'"';
const modifiedMarker='\n      "composability_control": {"spacing":  "keep exactly"},'+marker;
const priorText=(await import('node:child_process')).execFileSync('git',['show',x.input.source_parent+':'+x.input.ledger_path],{cwd:root,maxBuffer:20*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}}).toString();
assert.equal(priorText.split(marker).length,2);const modified=Buffer.from(priorText.replace(marker,modifiedMarker));
const readModified=p=>p===x.input.ledger_path?modified:read(p);
const composable=buildProgressMediaSource4903({root,read:readModified});
const baseline=buildProgressMediaSource4903({root,read:p=>p===x.input.ledger_path?Buffer.from(priorText):read(p)});
assert.deepEqual(composable.writes.get(x.input.ledger_path),Buffer.from(baseline.writes.get(x.input.ledger_path).toString().replace(marker,modifiedMarker)),'unrelated bytes changed');
for(const mutation of [
 rows=>{rows.find(r=>x.entries.has(r.sha)).unreviewed=true;},
 rows=>{delete rows.find(r=>x.entries.has(r.sha)).sha;},
 rows=>{rows.push(structuredClone(rows.find(r=>x.entries.has(r.sha))));},
 rows=>{rows.find(r=>x.entries.has(r.sha)).individual_proof=null;},
]){const ledger=JSON.parse(modified);mutation(ledger.entries);const bad=Buffer.from(JSON.stringify(ledger));assert.throws(()=>buildProgressMediaSource4903({root,read:p=>p===x.input.ledger_path?bad:read(p)}));}
for(const old of x.input.prior_entries){const next=x.entries.get(old.sha),field=old.sha.startsWith('231f94')?'media_matcher_behavior':'progress_csp_behavior';const oldProof=structuredClone(old.individual_proof),newProof=structuredClone(next.individual_proof);delete oldProof[field].source_members;delete newProof[field].source_members;assert.deepEqual(newProof,oldProof,'decision or runtime scope changed');const body=JSON.parse(read(next.evidence_report));assert.deepEqual(body.progress_media_source_requalification.prior_entry,old);assert.equal(body.progress_media_source_requalification.actual_native_packed_or_floor_qualified,false);}
let mutants=0;for(const path of ['compatibility/rc/progress-media-source-4903-inputs.json',x.input.ledger_path,...x.input.reviewed_changes.map(r=>r.path),...x.input.prior_reports.map(r=>r.path)]){const corrupt=p=>p===path?Buffer.concat([read(p),Buffer.from('\ncorrupt')]):read(p);assert.throws(()=>buildProgressMediaSource4903({root,read:corrupt}),undefined,'unrejected corruption '+path);mutants++;}
console.log(JSON.stringify({selected_rows:3,authenticated_complete_deltas:13,source_corruption_controls:mutants,unrelated_ledger_preserved:true,unrelated_live_edit_byte_preserved:true,selected_mutations_rejected:4,no_coordinator_rejected:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'}));
