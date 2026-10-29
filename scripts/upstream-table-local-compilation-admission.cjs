/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One current source applicability decision; no full table or native acceptance. */
'use strict';
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {readFileSync,readdirSync}=require('node:fs');
const {join,resolve}=require('node:path');
const {gunzipSync}=require('node:zlib');
const ROOT=resolve(__dirname,'..'),HANDLER='scripts/upstream-table-local-compilation-admission.cjs';
const SHA='3f35b12290ea4dbee4a9d82845c0964b2b4df50d';
const PREFIX='compatibility/rc/21x-table-local-compilation-admission-',SOURCE_PREFIX='compatibility/rc/21x-table-local-compilation-source-';
const REVIEW=PREFIX+'individual-review.json',REVIEW_HASH='874a23662d7999b10f5102928110d4dfc5780e8cc464999f957ce758a81fba2e';
const DIFF='1e71aa817057896402ff67e9b11b7878983f0f7709cd056a47b81a219871ad81';
const QUALIFICATION={path:SOURCE_PREFIX+'qualification.json',sha256:'477be6136404b7c19b4ed62923ad8c9b198c652550f20b90df685a83a524fd09',bytes:7600};
const SOURCE_REVIEW={path:SOURCE_PREFIX+'review.json',sha256:'4e2a280124b2d4281b0e513381c7d0a01382fa8149dde5d2a1a3b47842ef41a0',bytes:45602};
const INPUTS={path:SOURCE_PREFIX+'current.json',sha256:'e6746247cfbc087ca360e78ee950f9770f3f5ea444f9ec455c3c6fceb56ab0cb',bytes:18106};
const VERIFIER={path:'scripts/upstream-table-local-compilation-source.mjs',sha256:'c974a2f88021e8d6c8e238978b677061494565f2d084e2f2a859fb39b7be5772',bytes:27348};
const COMPILER=[{path:SOURCE_PREFIX+'compiler.json',sha256:'e2d915d5596015ade4ac95f83bf7071549dd9a3364db8315d2c3d17c518393eb',bytes:50827},{path:SOURCE_PREFIX+'compiler-controls.json',sha256:'f141692ed853a4def772a2ab2549e2709d5ee039837339dcadde2fa977b66364',bytes:28045}];
const KIND='individual-historical-table-local-compilation-source-review',SCOPE='table_local_compilation_source_scope';
const hash=raw=>createHash('sha256').update(raw).digest('hex'),image=readFileSync(__filename),handlerRef={path:HANDLER,sha256:hash(image),bytes:image.length};
const FRAME_PATHS=['compatibility/f10/disposition-ledger/ledger.json','compatibility/rc/21x-remaining-disposition-worksheet.json','scripts/upstream-source-contract-registry.mjs','compatibility/rc/21x-legacy-removal-admission-canonical-qualified.json'];
function tableLocalCompilationProof(row){
 assert.equal(row?.sha,SHA);
 return {proof_kind:KIND,diff_sha256:DIFF,review_depth:'individual-compatibility',affected_branches:['21.x'],decision:row.decision,
  [SCOPE]:{sha:SHA,review:{path:REVIEW,sha256:REVIEW_HASH},source_qualification:{...QUALIFICATION},source_review:{...SOURCE_REVIEW},source_inputs:{...INPUTS},source_verifier:{...VERIFIER},compiler_receipts:structuredClone(COMPILER),handler:{...handlerRef},complete_original_files:2,original_hunks:7,actual_extracted_row_compiler_cells:6,generated_component_definitions_compared:18,original_failure_reproduced_at_minimum:false,source_scope_only:true,actual_native_packed_browser_floor_or_full_audit_qualified:false}};
}
/** Exact metadata only; neither reads files nor accepts a cached source result. */
function metadataOk({entry,body,review,proof=entry?.individual_proof}){
 try{
  assert.equal(hash(JSON.stringify(body,null,2)+'\n'),REVIEW_HASH);assert.deepEqual(body,review);
  assert.equal(body.line,'21.x');assert.equal(body.sha,SHA);assert.equal(body.status,'reviewed');assert.equal(body.source_review_complete,true);
  assert.equal(body.proposed_final_disposition,'do-not-adopt');assert.equal(body.read_note_disposition,'owned-retained');assert.equal(body.source_scope_only,true);assert.equal(body.g11_claim,'not-passed');
  assert.equal(body.original_files,2);assert.equal(body.original_hunks,7);assert.equal(body.whole_original_hunk_reviews.length,7);assert.deepEqual(body.complete_original_paths,['src/material/table/row.ts','src/material/table/table.ts']);assert.equal(body.diff_sha256,DIFF);
  assert.deepEqual(body.source_qualification,QUALIFICATION);assert.deepEqual(body.source_review,SOURCE_REVIEW);assert.deepEqual(body.source_inputs,INPUTS);assert.deepEqual(body.source_verifier,VERIFIER);assert.deepEqual(body.compiler_receipts,COMPILER);
  assert.equal(body.actual_extracted_row_compiler_cells,6);assert.equal(body.generated_component_definitions_compared,18);assert.equal(body.original_failure_reproduced_at_minimum,false);assert.equal(body.full_owned_table_module_AOT_or_rendering_qualified,false);assert.equal(body.actual_native_packed_browser_floor_or_full_audit_qualified,false);
  assert.equal(entry.sha,SHA);assert.equal(entry.final_disposition,'do-not-adopt');assert.equal(entry.read_note_disposition,'owned-retained');assert.equal(entry.reason,body.decision);assert.ok(entry.reason.length>80);
  assert.equal(entry.review_depth,'individual-compatibility');assert.deepEqual(entry.affected_branches,['21.x']);assert.deepEqual(entry.files,body.frozen_seed_paths);assert.equal(entry.evidence_report,REVIEW);assert.equal(entry.g11_claim,'not-passed');
  assert.deepEqual(proof,tableLocalCompilationProof(body));assert.deepEqual(entry.individual_proof,proof);return true;
 }catch{return false;}
}
function familyPopulation(root){const out=[];function walk(path){for(const entry of readdirSync(join(root,path),{withFileTypes:true})){
 const member=path+'/'+entry.name;if(entry.isDirectory())walk(member);else if(entry.isFile()&&!member.endsWith('.spec.ts'))out.push(member);
 }}walk('projects/ngx-material-legacy/legacy-table');return out.sort();}
/** Fresh pure original/metadata/compiler inspection of current physical sources. */
function inspectSource({entry,body,review,proof,root=ROOT,read=path=>readFileSync(join(root,path))}){
 assert.equal(resolve(root),ROOT);assert.equal(metadataOk({entry,body,review,proof}),true);
 const bound=new Map(),member=ref=>{const raw=read(ref.path);assert.ok(Buffer.isBuffer(raw));assert.equal(hash(raw),ref.sha256,'changed table compilation admission source '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);bound.set(ref.path,{...ref,bytes:raw.length});return raw;};
 for(const ref of [{path:REVIEW,sha256:REVIEW_HASH},QUALIFICATION,SOURCE_REVIEW,INPUTS,VERIFIER,...COMPILER,handlerRef,{path:body.patch_file,sha256:DIFF}])member(ref);
 assert.deepEqual(JSON.parse(read(REVIEW)),body);
 const sourceReview=JSON.parse(read(SOURCE_REVIEW.path)),inputs=JSON.parse(read(INPUTS.path));
 assert.deepEqual(inputs.protected_canonical_members.map(ref=>ref.path),FRAME_PATHS);
 // The exact aggregate ledger/registry/roster transaction belongs to the
 // shared owner. These four frozen observations are not current source inputs.
 // Every product,peer,compiler and proof member still uses the actual reader.
 for(const ref of sourceReview.source_bindings)if(!FRAME_PATHS.includes(ref.path))member(ref);
 for(const ref of [...inputs.family_members,...inputs.support_members,...inputs.compiler_members])member(ref);
 const population=familyPopulation(root);assert.equal(population.length,37);assert.deepEqual(population,inputs.family_members.map(ref=>ref.path));
 const original=JSON.parse(gunzipSync(read(sourceReview.originals.path))),census=JSON.parse(gunzipSync(read(sourceReview.source_census.path)));
 assert.equal(original.diff,read(body.patch_file).toString());
 // This import has no execution-on-import CLI. The already qualified pure
 // routines inspect the current arguments; no old captured program is run.
 const source=require('./upstream-table-local-compilation-source.mjs');
 const originalFacts=source.verifyTableLocalCompilationOriginal(original,census);
 const ownedFacts=source.inspectTableLocalCompilationOwnedSource(read('projects/ngx-material-legacy/legacy-table/row.ts').toString(),read('projects/ngx-material-legacy/legacy-table/table.ts').toString(),read('projects/ngx-material-legacy/legacy-table/table-module.ts').toString(),original.tagged_reference.members[0].body);
 const compilerFacts=source.verifyTableLocalCompilationCompiler(JSON.parse(read(COMPILER[0].path)),JSON.parse(read(COMPILER[1].path)),read('projects/ngx-material-legacy/legacy-table/row.ts').toString(),original);
 for(const facts of [originalFacts,ownedFacts,compilerFacts])for(const [key,value]of Object.entries(facts))assert.deepEqual(value,sourceReview[key],'fresh table source judgment '+key);
 assert.deepEqual(body.whole_original_hunk_reviews,originalFacts.hunk_reviews);assert.equal(body.decision,sourceReview.proposed_reason);
 const assertCurrent=()=>{for(const ref of bound.values()){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'late table compilation admission input '+ref.path);assert.equal(raw.length,ref.bytes);}assert.deepEqual(familyPopulation(root),population);};
 assertCurrent();return {bound:structuredClone([...bound.values()]),assertCurrent,facts:{original_files:2,original_hunks:7,current_family_members:37,actual_extracted_row_compiler_cells:6,generated_component_definitions_compared:18,original_failure_reproduced_at_minimum:false,full_table_module_or_native_qualified:false,canonical_transaction_delegated_to_shared_owner:true}};
}
function sourceOk(args){try{const current=inspectSource(args);current.assertCurrent();return true;}catch{return false;}}
function inspectCanonicalSource({entries,body,...args}){
 assert.deepEqual(entries.map(row=>row.sha),[SHA]);const source=inspectSource({...args,entry:entries[0],body,review:body,proof:entries[0].individual_proof});
 return {...source,individual_metadata_cases:1,fresh_whole_body_source_reviews:1,source_scope_only:true,current_native_packed_floor_or_G11_credit:false};
}
module.exports={TABLE_LOCAL_COMPILATION_SHA:SHA,TABLE_LOCAL_COMPILATION_REVIEW:REVIEW,TABLE_LOCAL_COMPILATION_REVIEW_HASH:REVIEW_HASH,TABLE_LOCAL_COMPILATION_PROOF_KIND:KIND,TABLE_LOCAL_COMPILATION_SCOPE_KEY:SCOPE,tableLocalCompilationProof,metadataOk,sourceOk,inspectSource,inspectCanonicalSource};
