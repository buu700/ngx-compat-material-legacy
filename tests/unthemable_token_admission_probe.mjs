/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Five pure metadata contracts, real shared source validation and late-change rejection. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import admission from '../scripts/upstream-unthemable-token-admission.cjs';
import {reviewMetadataComplete,individualReviewScopeOk} from '../scripts/upstream-individual-evidence-scope.mjs';
import {requiresRegisteredSourceReview} from '../scripts/upstream-registered-source-review.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path));
const {UNTHEMED_SHAS:SHAS,UNTHEMED_REVIEW:REVIEW,unthemedProof,unthemedMetadataOk,inspectUnthemedSource,unthemedSourceOk}=admission;
const body=JSON.parse(read(REVIEW)),entries=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json')).entries.filter(row=>SHAS.includes(row.sha));
assert.equal(entries.length,5);
const marker=entries[0].individual_proof.unthemable_token_source_scope;
const pure=runInNewContext('const unthemedProof=('+unthemedProof.toString()+');('+unthemedMetadataOk.toString()+')',{
  assert:{equal:assert.equal,ok:assert.ok,deepEqual:(a,b)=>assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)))},
  DIFFS:Object.fromEntries(body.reviews.map(row=>[row.sha,row.diff_sha256])),KIND:entries[0].individual_proof.proof_kind,
  REVIEW,REVIEW_HASH:marker.review.sha256,QUALIFICATION:marker.qualification.path,QUALIFICATION_HASH:marker.qualification.sha256,
  RESOLUTION:marker.tooltip_context.path,RESOLUTION_HASH:marker.tooltip_context.sha256,
  hash:raw=>createHash('sha256').update(raw).digest('hex'),isDeepStrictEqual,
});
const rejected=[];
for(const entry of entries){
  const review=body.reviews.find(row=>row.sha===entry.sha),args={entry,body,review,proof:entry.individual_proof};
  assert.equal(pure(args),true);assert.equal(unthemedMetadataOk(args),true);assert.equal(reviewMetadataComplete(args),true);
  assert.equal(requiresRegisteredSourceReview({...entry,individual_proof:undefined}),true,'known SHA cannot escape by stripping its proof');
  assert.equal(individualReviewScopeOk({...args,requiresIndividual:true,claimsBehavior:false}),true);
  for(const [id,change]of [
    ['missing-marker',value=>delete value.individual_proof.unthemable_token_source_scope],
    ['wrong-kind',value=>value.individual_proof.proof_kind='individual-semantic'],
    ['wrong-final',value=>value.final_disposition='not-applicable'],
    ['wrong-SHA',value=>value.sha='0'.repeat(40)],
    ['wrong-branch',value=>value.affected_branches=['main']],
    ['forged-reconciliation',value=>value.individual_proof.unthemable_token_source_scope.tooltip_context.sha256='0'.repeat(64)],
    ['forged-native-credit',value=>value.individual_proof.unthemable_token_source_scope.actual_native_artifact_browser_floor_or_full_audit_qualified=true],
  ]){
    const bad=structuredClone(entry);change(bad);assert.equal(reviewMetadataComplete({...args,entry:bad,proof:bad.individual_proof}),false,id);rejected.push(entry.sha+':'+id);
  }
}
assert.equal(requiresRegisteredSourceReview({sha:'f'.repeat(40)},{proof_kind:entries[0].individual_proof.proof_kind}),true);
assert.equal(requiresRegisteredSourceReview({sha:'f'.repeat(40)},{proof_kind:'unrelated-fixture'}),false);
const first=entries[0],args={root,entry:first,body,review:body.reviews.find(row=>row.sha===first.sha),proof:first.individual_proof};
const inspected=inspectUnthemedSource({root,read});assert.ok(inspected.bound.length>500);
for(const path of [REVIEW,marker.qualification.path,marker.tooltip_context.path,
  'scripts/measure-unthemable-token-contracts.mjs','projects/ngx-material-legacy/styles/legacy-tooltip/_tooltip-theme.scss',
  'projects/ngx-material-legacy/legacy-tooltip/tooltip.scss','node_modules/@angular/material/package.json']){
  const corrupt=name=>name===path?Buffer.concat([read(name),Buffer.from('\n')]):read(name);
  assert.equal(unthemedSourceOk({...args,read:corrupt}),false,path);rejected.push('changed:'+path);
}
let late=null;const live=path=>path===late?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
assert.equal(unthemedSourceOk({...args,read:live}),true);
late='projects/ngx-material-legacy/styles/core/theming/_palette.scss';assert.equal(unthemedSourceOk({...args,read:live}),false);rejected.push('late-source-after-cache');
const report={schema_version:1,line:'21.x',pure_metadata_cases:5,mandatory_shared_source_cases:5,
  pure_metadata_without_filesystem_or_compiler_bindings:true,rejection_controls:rejected.length,rejected,
  registered_source_required_independently_of_final_label:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
