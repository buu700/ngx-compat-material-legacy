/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact completion metadata and fresh compiler source evidence are distinct. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import admission from '../scripts/upstream-token-build-admission.cjs';
import {reviewMetadataComplete,individualReviewScopeOk} from '../scripts/upstream-individual-evidence-scope.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path));
const {TOKEN_BUILD_SHA:SHA,TOKEN_BUILD_REVIEW:REVIEW,tokenBuildProof,tokenBuildMetadataOk,inspectTokenBuildSource,tokenBuildSourceOk}=admission;
const body=JSON.parse(read(REVIEW)),prior=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json')).entries.find(row=>row.sha===SHA);
assert.ok(prior&&['needs-individual-review','already-adapted'].includes(prior.final_disposition));
const entry={...structuredClone(prior),final_disposition:'already-adapted',reason:body.decision,review_depth:'individual-compatibility',
  evidence_report:REVIEW,individual_proof:tokenBuildProof(body)};
const args={entry,body,review:body,proof:entry.individual_proof};
assert.equal(tokenBuildMetadataOk(args),true);assert.equal(reviewMetadataComplete(args),true);
const pure=runInNewContext('const tokenBuildProof=('+tokenBuildProof.toString()+');('+tokenBuildMetadataOk.toString()+')',{
  assert:{equal:assert.equal,ok:assert.ok,deepEqual:(a,b)=>assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)))},
  SHA,REVIEW,DIFF:'fc9af813f253527709e843280bd5d51ca160ed5f1b37b80b95be30413d9b593d',
  KIND:entry.individual_proof.proof_kind,REVIEW_HASH:entry.individual_proof.mdc_token_source_scope.review.sha256,
  QUALIFICATION:entry.individual_proof.mdc_token_source_scope.qualification.path,QUALIFICATION_HASH:entry.individual_proof.mdc_token_source_scope.qualification.sha256,
  hash:raw=>createHash('sha256').update(raw).digest('hex'),isDeepStrictEqual,
});
assert.equal(pure(args),true,'metadata check must work without filesystem or compiler bindings');
assert.equal(tokenBuildSourceOk({...args,root,read}),true);
assert.equal(individualReviewScopeOk({...args,requiresIndividual:true,claimsBehavior:true}),true);
const rejected=[];
for(const [id,mutate]of [
  ['stripped-marker',value=>delete value.individual_proof.mdc_token_source_scope],
  ['changed-kind',value=>value.individual_proof.proof_kind='individual-semantic'],
  ['wrong-disposition',value=>value.final_disposition='not-applicable'],
  ['wrong-SHA',value=>value.sha='0'.repeat(40)],
  ['wrong-branch',value=>value.affected_branches=['main']],
  ['forged-review',value=>value.individual_proof.mdc_token_source_scope.review.sha256='0'.repeat(64)],
  ['claimed-native-credit',value=>value.individual_proof.mdc_token_source_scope.actual_native_artifact_browser_floor_or_full_audit_qualified=true],
]){
  const bad=structuredClone(entry);mutate(bad);assert.equal(reviewMetadataComplete({...args,entry:bad,proof:bad.individual_proof}),false,id);rejected.push(id);
}
const inspected=inspectTokenBuildSource({root,read});assert.ok(inspected.bound.length>120);
for(const path of [REVIEW,'compatibility/rc/21x-c04-token-test-build-slot-scope.json',
  'scripts/measure-owned-mdc-token-slots.mjs','projects/ngx-material-legacy/styles/vendor/mdc/theme/_validate.scss',
  'projects/ngx-material-legacy/package.json']){
  const corrupt=name=>name===path?Buffer.concat([read(name),Buffer.from(' ')]):read(name);
  assert.equal(tokenBuildSourceOk({...args,root,read:corrupt}),false,path);rejected.push('changed:'+path);
}
let late=null;const live=path=>path===late?Buffer.concat([read(path),Buffer.from(' ')]):read(path);
assert.equal(tokenBuildSourceOk({...args,root,read:live}),true);
late='projects/ngx-material-legacy/styles/core/tokens/m2/mdc/_filled-text-field.scss';
assert.equal(tokenBuildSourceOk({...args,root,read:live}),false);rejected.push('late-source-after-measurement-cache');
const report={schema_version:1,line:'21.x',pure_metadata_without_filesystem_or_compiler_bindings:true,
  positive_shared_scope_and_fresh_compiler:true,rejection_controls:rejected.length,rejected,
  root_checker_file_changed:false,canonical_decisions_changed:0,
  actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
