/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One fresh whole-body source review for every metadata row in a finite family. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import theming from './upstream-theming-inspection-admission.cjs';
import inspection from './upstream-inspection-compatibility-admission.cjs';
import selectorDensity from './upstream-selector-density-admission.cjs';
import buttonTokenization from './upstream-button-tokenization-admission.cjs';
import {reviewThemingInspectionSource} from './upstream-theming-inspection-source-review.mjs';
import {reviewInspectionCompatibilitySource} from './upstream-inspection-compatibility-source-review.mjs';
import {reviewSelectorDensitySource} from './upstream-selector-density-source-review.mjs';
import {reviewButtonTokenizationSource} from './upstream-button-tokenization-source-review.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const PATH='scripts/canonical-source-transaction.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const SELF={path:PATH,sha256:hash(image),bytes:image.length};
const families={
 theming:{handler:theming,review:reviewThemingInspectionSource,prefix:'THEMING',scope:'theming_inspection_source_scope'},
 inspection:{handler:inspection,review:reviewInspectionCompatibilitySource,prefix:'INSPECTION',scope:'inspection_compatibility_source_scope'},
 'selector-density':{handler:selectorDensity,review:reviewSelectorDensitySource,prefix:'SELECTOR_DENSITY',scope:'selector_density_source_scope'},
 'button-tokenization':{handler:buttonTokenization,review:reviewButtonTokenizationSource,prefix:'BUTTON_TOKENIZATION',scope:'button_tokenization_source_scope'},
};
export const canonicalSourceTransactionReference=()=>({...SELF});

/** No result, source scope, compiler callback, or prior transaction can be injected. */
export function inspectCanonicalSourceTransaction({family,entries,body,root=ROOT,read=path=>readFileSync(join(root,path))}={}){
 assert.equal(resolve(root),ROOT);assert.ok(Object.hasOwn(families,family),'unknown canonical source family');
 const spec=families[family],handler=spec.handler,shas=handler[spec.prefix+'_SHAS'];
 const reviewPath=handler[spec.prefix+'_REVIEW'],reviewHash=handler[spec.prefix+'_REVIEW_HASH'];
 const assertMetadata=()=>{
  assert.deepEqual(entries.map(entry=>entry.sha),shas,'incomplete canonical source metadata population');
  assert.deepEqual(body.reviews.map(row=>row.sha),shas);
  for(const entry of entries)assert.equal(handler.metadataOk({entry,body,review:body.reviews.find(row=>row.sha===entry.sha)}),true,'invalid canonical source metadata '+entry.sha);
 };
 assertMetadata();
 const handlerRef=entries[0].individual_proof[spec.scope].handler;
 const bound=[SELF,{path:reviewPath,sha256:reviewHash},body.source_qualification,body.source_review,handlerRef,
  ...body.reviews.map(row=>({path:row.patch_file,sha256:row.diff_sha256}))].map(ref=>({...ref}));
 const assertBound=()=>{
  for(const ref of bound){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed canonical source transaction input '+ref.path);if(ref.bytes!==undefined)assert.equal(raw.length,ref.bytes);}
 };
 assertBound();assert.deepEqual(JSON.parse(read(reviewPath)),body);
 // Every call executes the actual owned verifier, including its compiler work.
 // There is deliberately no transaction/result map outside this invocation.
 const current=spec.review({root,read});
 assert.deepEqual(current.report,JSON.parse(read(body.source_review.path)),'fresh canonical whole-body source report differs');
 const assertCurrent=()=>{assertMetadata();assertBound();current.assertCurrent();assertBound();};
 assertCurrent();
 return {bound:structuredClone([...bound,...current.bound]),assertCurrent,individual_metadata_cases:entries.length,
  fresh_whole_body_source_reviews:1,compiler_cases:(current.report.selector_measurement?.case_count??0)+(current.report.density_measurement?.case_count??0)+(current.report.button_measurement?.case_count??0),
  source_scope_only:true,current_native_packed_floor_or_G11_credit:false};
}
