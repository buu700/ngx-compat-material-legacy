/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {inspectMaterialRemainingCallerReview} from '../scripts/material-remaining-caller-reviews.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const ledgers=['compatibility/f10/authored-dependency-dispositions.json',
  'compatibility/f10/authored-dependency-current-dispositions.json','compatibility/f10/disposition-ledger/ledger.json'];
const before=ledgers.map(path=>hash(read(path))),q=inspectMaterialRemainingCallerReview({root});
assert.equal(q.review.reviews.length,7);assert.equal(q.rows.length,7);
assert.equal(q.rows.filter(row=>row.ledger.endsWith('/authored-dependency-dispositions.json')).length,6);
for(const row of q.review.reviews){
  assert.equal(row.conclusion,'stable-public-peer');
  assert.equal(row.candidate_source_sha256,hash(read('projects/ngx-material-legacy/'+row.file)));
  assert.equal(row.actual_native_packed_AOT_or_full_floor_qualified,false);
  assert.ok(row.current_source_role);assert.ok(row.decision.length>150);
  for(const ref of row.independent_evidence)assert.equal(hash(read(ref.path)),ref.sha256);
}
const direct=new Set(q.source.prior.sources.map(member=>member.path));
const types=JSON.parse(read('compatibility/rc/material-remaining-caller-type-verification.json'));
const sdk=JSON.parse(read('compatibility/rc/material-remaining-caller-public-subjects.json'));
const controls=[...direct,q.source.prior.graph.find(member=>!direct.has(member.path)).path,
  types.report.path,'compatibility/rc/material-remaining-caller-input-verification.json',
  'compatibility/rc/material-remaining-caller-harness-verification.json',sdk.subjects[0].additions[0].path];
assert.equal(new Set(controls).size,10);
for(const changed of controls)assert.throws(()=>inspectMaterialRemainingCallerReview({root,read:path=>
  path===changed?Buffer.concat([read(path),Buffer.from('\n')]):read(path)}),error=>error?.code==='ERR_ASSERTION');
let changed;
const late=path=>path===changed?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
inspectMaterialRemainingCallerReview({root,read:late});
for(changed of [q.source.prior.sources[0].path,'compatibility/rc/material-remaining-caller-input-verification.json'])
  assert.throws(()=>inspectMaterialRemainingCallerReview({root,read:late}),error=>error?.code==='ERR_ASSERTION');
assert.deepEqual(ledgers.map(path=>hash(read(path))),before);
const report={schema_version:1,line:q.line,prepared_individual_reviews:7,stable_public_peer:7,
  frozen:6,additional:1,current_source_files:91,input_corruptions_rejected:10,late_changes_rejected:2,
  canonical_ledgers_unchanged:true,canonical_writes_performed:0,
  actual_native_packed_AOT_or_full_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
