/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Isolated physical-frame control: never run against a user's working tree.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {candidateSourceEvidenceOk,candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
import {individualReviewScopeOk} from '../scripts/upstream-individual-evidence-scope.mjs';
const ledger=JSON.parse(readFileSync(process.env.POPULATION_LEDGER,'utf8'));
const sha='de40f2eec4c0eeadfa40fba040f5c9dcbb1ea8c4';const entry=ledger.entries.find(x=>x.sha===sha);assert.ok(entry);
const proof=entry.individual_proof, review=JSON.parse(readFileSync(entry.evidence_report,'utf8'));
const read=p=>readFileSync(p),paths=()=>candidateProductSourcePaths(process.cwd());
const scope=()=>individualReviewScopeOk({entry,proof,body:review,review,requiresIndividual:true,claimsBehavior:false});
assert.equal(scope(),true);assert.equal(candidateSourceEvidenceOk(proof,read,paths),true);
const unknown=structuredClone(proof);unknown.unexpected_scope='forged';assert.equal(individualReviewScopeOk({entry,proof:unknown,body:review,review,requiresIndividual:true,claimsBehavior:false}),false);
const absent=structuredClone(proof);delete absent.source_population;const oldReview=structuredClone(review);delete oldReview.source_population;assert.equal(individualReviewScopeOk({entry,proof:absent,body:oldReview,review:oldReview,requiresIndividual:true,claimsBehavior:false}),true);
const outside=structuredClone(proof);outside.source_population='custom-glob';assert.equal(candidateSourceEvidenceOk(outside,read,paths),false);
const target='projects/ngx-material-legacy/internal/c04-population-control.ts';assert.equal(existsSync(target),false);
const drift='projects/ngx-material-legacy/legacy-menu/internal/menu-content-base.ts';const original=readFileSync(drift);const hash=b=>createHash('sha256').update(b).digest('hex');const results=[];
function checker(label,expected){
 const report=`${process.env.POPULATION_REPORT_DIR}/${label}.json`;
 const r=spawnSync(process.execPath,['scripts/check-upstream-audit-disposition.mjs','--admission','--line','main','--ledger',process.env.POPULATION_LEDGER,'--report',report],{encoding:'utf8',timeout:120000});
 assert.equal(r.status,1,label+' expected overall admission failure');const result=JSON.parse(readFileSync(report,'utf8'));const rejected=result.insufficient_review_sha_ids.individual.includes(sha);assert.equal(rejected,expected,label+' unexpected target admission');results.push({label,target_rejected:rejected,overall_result:result.result,g11:result.g11_claim});
}
try{
 checker('positive',false);
 writeFileSync(target,"import {DragDropRegistry} from '@angular/cdk/drag-drop';\nexport type Negative = DragDropRegistry;\n");assert.equal(candidateSourceEvidenceOk(proof,read,paths),false);checker('new-importer',true);unlinkSync(target);
 writeFileSync(drift,Buffer.concat([original,Buffer.from('\n// isolated population drift control\n')]));assert.equal(candidateSourceEvidenceOk(proof,read,paths),false);checker('physical-drift',true);writeFileSync(drift,original);
 assert.equal(hash(readFileSync(drift)),hash(original));assert.equal(candidateSourceEvidenceOk(proof,read,paths),true);checker('recovery',false);
 console.log(JSON.stringify({results,unselected_legacy_proofs:'tested separately',target_restored:!existsSync(target),drift_restored:hash(readFileSync(drift))===hash(original)},null,2));
}finally{if(existsSync(target))unlinkSync(target);writeFileSync(drift,original);}
