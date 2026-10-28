/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {inspectCanonicalSourceTransaction,canonicalSourceTransactionReference} from '../scripts/canonical-source-transaction.mjs';
import theming from '../scripts/upstream-theming-inspection-admission.cjs';
import inspection from '../scripts/upstream-inspection-compatibility-admission.cjs';
import selector from '../scripts/upstream-selector-density-admission.cjs';
import button from '../scripts/upstream-button-tokenization-admission.cjs';
const root=process.cwd(),disk=path=>readFileSync(join(root,path)),ledger=JSON.parse(disk('compatibility/f10/disposition-ledger/ledger.json')),rejected=[],cases=[];
const specs=[['theming',theming,'THEMING','theming_inspection_source_scope','scripts/upstream-theming-inspection-source-review.mjs',2,0],
 ['inspection',inspection,'INSPECTION','inspection_compatibility_source_scope','scripts/upstream-inspection-compatibility-source-review.mjs',4,0],
 ['selector-density',selector,'SELECTOR_DENSITY','selector_density_source_scope','scripts/upstream-selector-density-source-review.mjs',2,20],
 ['button-tokenization',button,'BUTTON_TOKENIZATION','button_tokenization_source_scope','scripts/upstream-button-tokenization-source-review.mjs',5,14]];
for(const [family,handler,prefix,scopeKey,sourceChecker,expectedRows,compilerCases]of specs){
 const body=JSON.parse(disk(handler[prefix+'_REVIEW'])),entries=handler[prefix+'_SHAS'].map(sha=>structuredClone(ledger.entries.find(row=>row.sha===sha)));
 assert.equal(entries.length,expectedRows);assert.ok(entries.every(Boolean));
 for(const fault of ['missing-row','duplicate-row','row-order','missing-proof','kind','native-claim','body-clearance','proof-branch']){
  const x={family,entries:structuredClone(entries),body:structuredClone(body),root,read:disk};
  if(fault==='missing-row')x.entries.pop();
  if(fault==='duplicate-row')x.entries[1]=structuredClone(x.entries[0]);
  if(fault==='row-order')x.body.reviews.reverse();
  if(fault==='missing-proof')delete x.entries[0].individual_proof;
  if(fault==='kind')x.entries[0].individual_proof.proof_kind='unrecognized';
  if(fault==='native-claim')x.entries[0].individual_proof[scopeKey].actual_native_artifact_browser_floor_or_full_audit_qualified=true;
  if(fault==='body-clearance')x.body.g11_claim='passed';
  if(fault==='proof-branch')x.entries[0].affected_branches=['main'];
  assert.throws(()=>inspectCanonicalSourceTransaction(x),undefined,fault);rejected.push(family+'/metadata/'+fault);
 }
 let late=null;const read=path=>path===late?Buffer.concat([disk(path),Buffer.from('\n')]):disk(path);
 const current=inspectCanonicalSourceTransaction({family,entries,body,root,read});
 assert.equal(current.individual_metadata_cases,expectedRows);assert.equal(current.fresh_whole_body_source_reviews,1);assert.equal(current.compiler_cases,compilerCases);assert.equal(current.current_native_packed_floor_or_G11_credit,false);
 const bound=new Set(current.bound.map(ref=>ref.path)),roles=[canonicalSourceTransactionReference().path,handler[prefix+'_REVIEW'],body.source_qualification.path,body.source_review.path,entries[0].individual_proof[scopeKey].handler.path,...body.reviews.map(row=>row.patch_file),'projects/ngx-material-legacy/styles/core/theming/_palette.scss',sourceChecker];
 for(const path of ['node_modules/sass/package.json','node_modules/sass/sass.node.js','node_modules/sass/sass.dart.js'])if(bound.has(path))roles.push(path);
 assert.equal(new Set(roles).size,roles.length);assert.ok(roles.every(path=>bound.has(path)));
 for(const path of roles){late=path;assert.throws(()=>current.assertCurrent(),undefined,path);rejected.push(family+'/late/'+path);}late=null;current.assertCurrent();
 late=sourceChecker;assert.throws(()=>inspectCanonicalSourceTransaction({family,entries,body,root,read,priorTransaction:current,sourceResult:{result:'pass'},review:()=>{throw new Error('caller review hook must not be used');}}));rejected.push(family+'/no-injected-or-cached-source-result');late=null;current.assertCurrent();
 entries[0].reason+=' altered';assert.throws(()=>current.assertCurrent());entries[0].reason=body.reviews[0].decision;current.assertCurrent();rejected.push(family+'/late-entry-metadata');
 body.reviews[0].status='pending';assert.throws(()=>current.assertCurrent());body.reviews[0].status='reviewed';current.assertCurrent();rejected.push(family+'/late-body-metadata');
 current.bound.length=0;late=body.reviews[0].patch_file;assert.throws(()=>current.assertCurrent());late=null;current.assertCurrent();rejected.push(family+'/public-bound-metadata-cannot-weaken-guards');
 cases.push({family,metadata_rows:expectedRows,fresh_whole_body_reviews:1,compiler_cases:compilerCases,guarded_source_paths:bound.size,late_faults_rejected:roles.length});
}
for(const family of ['unknown','constructor','__proto__']){assert.throws(()=>inspectCanonicalSourceTransaction({family,entries:[],body:{},root,read:disk}));rejected.push('family/'+family);}
assert.throws(()=>inspectCanonicalSourceTransaction({family:'theming',entries:[],body:{},root:'/tmp',read:disk}));rejected.push('wrong-root');
const ref=canonicalSourceTransactionReference();ref.sha256='0'.repeat(64);assert.notDeepEqual(canonicalSourceTransactionReference(),ref);rejected.push('public-reference-cannot-rewrite-tool-identity');
assert.equal(rejected.length,100);assert.equal(new Set(rejected).size,100);
const report={schema_version:1,result:'pass',cases,individual_metadata_rows:13,fresh_whole_body_reviews:4,compiler_cases:34,rejected,all_original_patch_guards_preserved:true,no_prior_result_or_caller_compiler_hook:true,late_entry_body_and_source_mutations_rejected:true,canonical_dispositions_changed:0,source_admissions:88,transaction_introduced_at_source_admissions:56,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
