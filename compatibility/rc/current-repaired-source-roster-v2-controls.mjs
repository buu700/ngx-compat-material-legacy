/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exercise actual roster and evidence predicates against omission and stale-input forgeries. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {authoredUseInventory,authoredUseReviewEvidence} from '../../scripts/authored-use-inventory.mjs';
const prefix='compatibility/rc/current-repaired-source-roster-',start=performance.now(),hash=b=>createHash('sha256').update(b).digest('hex'),key=r=>JSON.stringify([r.file,r.module,r.symbol]),cache=new Map(),physical=p=>{if(!cache.has(p))cache.set(p,readFileSync(p));return cache.get(p);},load=p=>JSON.parse(physical(p));
const out=process.argv[2];assert.ok(out?.startsWith(prefix));assert.equal(existsSync(out),false);
const result={schema_version:1,scope:'finite roster and source/evidence rejection controls',full_shipped_current_admission_qualified:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
try{
 const f=load(prefix+'v2-proposed-frozen.json'),a=load(prefix+'v2-proposed-additional.json'),reviewBytes=physical(prefix+'v2-proposed-review.json'),review=JSON.parse(reviewBytes),proof=load(prefix+'v2-preparation-proof.json'),w=load(prefix+'worksheet.json'),line=w.line;
 const reviewPath='compatibility/f10/authored-use-reviews/current-repaired-source-integration-v2.json',read=p=>p===reviewPath?reviewBytes:physical(p),subset={symbol_uses:review.reviews.map(r=>({file:r.file,module:r.module,symbol:r.symbol,status:'reviewed',disposition:'closed',source_review:{path:reviewPath,sha256:hash(reviewBytes)}}))};
 const positive=authoredUseReviewEvidence(subset,line,read,hash);assert.equal(positive.reviewed,176);assert.equal(positive.insufficient,0);
 const controls=[];const frozenKeys=f.symbol_uses.map(r=>({file:r.file,module:r.module,symbol:r.symbol})),extraKeys=a.symbol_uses.map(r=>({file:r.file,module:r.module,symbol:r.symbol}));
 const omitted=(candidate,expected,row,label)=>{const bad={...candidate,symbol_uses:candidate.symbol_uses.filter(r=>key(r)!==key(row))},r=authoredUseInventory(expected,bad);assert.equal(r.complete,false);assert.equal(r.missing,1);controls.push({label,rejected:true});};
 const newRows=proof.integrated_cases.filter(r=>!r.existing_obligation);assert.equal(newRows.length,2);for(const r of newRows)omitted(a,extraKeys,r,'new-import:'+key(r));
 for(const r of a.retained_removed_additional_uses)omitted(a,extraKeys,r,'retained-retirement:'+key(r));
 const removed=proof.integrated_cases.find(r=>r.existing_obligation&&!r.current_import_present&&f.symbol_uses.some(old=>key(old)===key(r)));assert.ok(removed);omitted(f,frozenKeys,removed,'removed-seed-obligation');
 const duplicate=authoredUseInventory(extraKeys,{...a,symbol_uses:[...a.symbol_uses,a.symbol_uses[0]]});assert.equal(duplicate.duplicates,1);assert.equal(duplicate.complete,false);controls.push({label:'duplicate-current-key',rejected:true});
 const outside=authoredUseInventory(frozenKeys,{...f,symbol_uses:[...f.symbol_uses,a.symbol_uses.find(r=>key(r)===key(newRows[0]))]});assert.equal(outside.outside,1);assert.equal(outside.complete,false);controls.push({label:'new-import-cannot-redefine-frozen-roster',rejected:true});
 const changed=(path,label,expected)=>{const observed=authoredUseReviewEvidence(subset,line,p=>p===path?Buffer.concat([read(p),Buffer.from('\n/* changed test bytes */\n')]):read(p),hash);assert.equal(observed.insufficient,expected,label);assert.ok(expected>0,label+' has no guarded dependency');controls.push({label,path,rejected:true,insufficient:observed.insufficient});};
 const sourcePaths=[...new Set(proof.integrated_cases.filter(r=>r.prior_candidate_source_sha256!==r.current_candidate_source_sha256).map(r=>'projects/ngx-material-legacy/'+r.file))];
 for(const path of sourcePaths)changed(path,'changed-current-source',review.reviews.filter(r=>'projects/ngx-material-legacy/'+r.file===path).length);
 const tool=proof.exact_tool_transition.path;changed(tool,'changed-qualified-tool-evidence',review.reviews.filter(r=>r.independent_evidence.some(e=>e.path===tool)).length);
 const oracle='reference/material-16.2.14/interface-sources/menu-panel.ts';changed(oracle,'original-tagged-menu-oracle',review.reviews.filter(r=>r.independent_evidence.some(e=>e.path===oracle)).length);
 changed(reviewPath,'changed-current-review',review.reviews.length);
 const noEvidence=structuredClone(subset);delete noEvidence.symbol_uses[0].source_review;assert.equal(authoredUseReviewEvidence(noEvidence,line,read,hash).insufficient,1);controls.push({label:'closed-label-without-review',rejected:true});
 const wrongHash=structuredClone(subset);wrongHash.symbol_uses[0].source_review.sha256='0'.repeat(64);assert.equal(authoredUseReviewEvidence(wrongHash,line,read,hash).insufficient,1);controls.push({label:'wrong-review-digest',rejected:true});
 const originalCurrentRef=review.reviews.find(r=>r.prior_source_review)?.prior_source_review;assert.ok(originalCurrentRef);changed(originalCurrentRef.path,'changed-original-review-record',review.reviews.filter(r=>r.independent_evidence.some(e=>e.path===originalCurrentRef.path)).length);
 Object.assign(result,{status:'pass',line,positive_reviewed:positive.reviewed,controls_rejected:controls.length,controls,all_original_obligations_preserved:true,source_bindings:[...cache].map(([path,b])=>({path,sha256:hash(b),bytes:b.length}))});
}catch(e){Object.assign(result,{status:'rejected',error:e.stack});process.exitCode=1;}
result.seconds=(performance.now()-start)/1000;writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,line:result.line,controls_rejected:result.controls_rejected,seconds:result.seconds,error:result.error}));
