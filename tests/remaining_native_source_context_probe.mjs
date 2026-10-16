/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete real source inspector plus metadata/role corruption controls; no native credit. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {REMAINING_NATIVE_SOURCE_INPUTS,inspectRemainingNativeSourceRequalification,reviewTabLayoutRoles,
  assertRemainingNativeMetadataState} from '../scripts/remaining-native-admission-source-requalification.mjs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),json=value=>Buffer.from(JSON.stringify(value));
const inputs=JSON.parse(read(REMAINING_NATIVE_SOURCE_INPUTS)),prior=JSON.parse(gunzipSync(read(inputs.prior.path))),supplement=JSON.parse(gunzipSync(read(inputs.supplement.path)));
const previous=new Map([...prior.members,...prior.review_subjects,...supplement.source_members,...supplement.review_subjects].map(row=>[row.path,Buffer.from(row.text)]));
const result=inspectRemainingNativeSourceRequalification({root});
assert.equal(result.source_scope_rows,52);assert.equal(result.authored_rows,13);assert.equal(result.runtime_contexts,17);assert.equal(result.writes.size,28);
assert.equal(result.frozenEvidence.reviewed,1446);assert.equal(result.frozenEvidence.insufficient,0);
assert.equal(result.currentAdmission.review_evidence.reviewed,178);assert.equal(result.currentAdmission.review_evidence.insufficient,0);
assert.equal(result.currentAdmission.source_snapshot_valid,true);assert.equal(result.currentAdmission.inventory.open,130);
assert.equal(result.proof.new_source_decisions,0);assert.equal(result.proof.new_authored_use_closures,0);
const tab='projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts',source=read(tab).toString(),before=previous.get(tab).toString();
const oldFrozen=JSON.parse(previous.get('compatibility/f10/authored-dependency-dispositions.json'));
const oldCurrent=JSON.parse(previous.get('compatibility/f10/authored-dependency-current-dispositions.json'));
const rows=[...oldFrozen.symbol_uses,...oldCurrent.symbol_uses].filter(row=>row.file==='legacy-tabs/internal/tab-body-base.ts'&&row.status==='reviewed'&&row.disposition==='closed');
let inspectorControls=0,roleControls=0,metadataControls=0,reviewControls=0;
for(const[path,change,pattern]of [
  [REMAINING_NATIVE_SOURCE_INPUTS,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/native source inputs changed/],
  [inputs.prior.path,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/native preceding archive changed/],
  [inputs.supplement.path,bytes=>Buffer.concat([bytes,Buffer.from(' ')]),/native preceding archive changed/],
  ['scripts/check-upstream-audit-disposition.mjs',bytes=>Buffer.concat([bytes,Buffer.from('\n// unreviewed\n')]),/tested current source/],
  ['scripts/upstream-artifact-behavior-evidence.mjs',bytes=>Buffer.concat([bytes,Buffer.from('\n// unreviewed\n')]),/unreviewed preceding source change/],
  ['projects/ngx-material-legacy/legacy-tabs/tab-body.html',bytes=>Buffer.concat([bytes,Buffer.from('<!-- changed -->')]),/unreviewed product change/],
  ['compatibility/f10/authored-dependency-dispositions.json',bytes=>{const d=JSON.parse(bytes);d.symbol_uses[0].status='unreviewed';return json(d);},/live source review\/disposition changed/],
]){
  const bytes=change(read(path));assert.notDeepEqual(bytes,read(path));
  assert.throws(()=>inspectRemainingNativeSourceRequalification({root,readMember:name=>name===path?bytes:read(name)}),pattern,path);inspectorControls++;
}
for(const[from,to]of [
  ["@Directive({standalone: false})","@Directive({standalone: true})"],
  ['ElementRef<HTMLElement>','ElementRef<SVGElement>'],['@Optional() private _dir','private _dir'],
  ['new EventEmitter<void>(true)','new EventEmitter<void>(false)'],
  ['changeDetectorRef: ChangeDetectorRef','changeDetectorRef: unknown'],
  ["content.style.removeProperty('visibility');",''],['content.getBoundingClientRect();',''],
  ["content?.style.visibility === 'hidden'",'content != null'],
  ["private _startTransition()",'public _startTransition()'],
  ["this._position == 'center'",'true'],
]){
  const mutated=source.replace(from,to);assert.notEqual(mutated,source,from);
  assert.throws(()=>reviewTabLayoutRoles(before,mutated,rows));roleControls++;
}
for(const change of [value=>value.pop(),value=>{value[0]=structuredClone(value[1]);},value=>{value[0].module='@angular/private';}]){
  const bad=structuredClone(rows);change(bad);assert.throws(()=>reviewTabLayoutRoles(before,source,bad));roleControls++;
}
const prospective=path=>result.writes.get(path)||read(path);
assertRemainingNativeMetadataState({root,previous,writes:result.writes,read:prospective});
// Every captured historical f10 subject must remain exact or equal its precise
// proposed version. This also checks old subjects that this writer never changes.
for(const[path,bytes]of previous){
  if(!path.startsWith('compatibility/f10/'))continue;
  const corrupted=Buffer.concat([prospective(path),Buffer.from(' ')]);
  assert.throws(()=>assertRemainingNativeMetadataState({root,previous,writes:result.writes,read:name=>name===path?corrupted:prospective(name)}),
    /live source review\/disposition changed/,path);metadataControls++;
}
const rolePath='compatibility/f10/authored-use-reviews/remaining-native-tab-requalified-boundaries.json';
const frozen=JSON.parse(result.writes.get('compatibility/f10/authored-dependency-dispositions.json'));
const current=JSON.parse(result.writes.get('compatibility/f10/authored-dependency-current-dispositions.json'));
const selected={symbol_uses:[...frozen.symbol_uses,...current.symbol_uses].filter(row=>row.file==='legacy-tabs/internal/tab-body-base.ts'&&row.status==='reviewed'&&row.disposition==='closed')};
assert.equal(selected.symbol_uses.length,13);
for(const mutate of [
  value=>value.reviews.pop(),value=>value.reviews.push(structuredClone(value.reviews[0])),
  value=>{value.reviews[0].candidate_source_sha256='0'.repeat(64);},
  value=>{value.reviews[0].independent_evidence=[];},value=>{value.reviews[0].independent_evidence[0].sha256='0'.repeat(64);},
]){
  const body=JSON.parse(result.writes.get(rolePath));mutate(body);const bytes=json(body),candidate=structuredClone(selected);
  for(const row of candidate.symbol_uses)row.source_review.sha256=hash(bytes);
  const observed=authoredUseReviewEvidence(candidate,result.line,path=>path===rolePath?bytes:prospective(path),hash);
  assert.ok(observed.insufficient>0);reviewControls++;
}
const report={schema_version:1,line:result.line,source_scope_rows:52,existing_runtime_contexts:17,existing_authored_receipts:13,
  actual_inspector_corruptions_rejected:inspectorControls,exact_tab_role_corruptions_rejected:roleControls,
  historical_metadata_corruptions_rejected:metadataControls,rehashed_role_review_corruptions_rejected:reviewControls,
  source_population_snapshot_valid:true,frozen_reviewed:1446,delta_reviewed:178,new_source_or_use_closures:0,
  inspector_sha256:hash(read('scripts/remaining-native-admission-source-requalification.mjs')),
  producer_sha256:hash(read('tests/remaining_native_source_context_probe.mjs')),
  actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
