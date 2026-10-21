/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Synthetic full-roster admission fixture; never a product semantic/G11 pass. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {scanCurrentAuthoredUses,currentAuthoredUseAdmission} from '../scripts/authored-current-use-inventory.mjs';
import {qualifiedMenuContentTypeBoundary,MENU_CONTENT_PANEL_SOURCE,MENU_CONTENT_PANEL_BEFORE,MENU_CONTENT_PANEL_AFTER} from '../scripts/menu-panel-content-boundary.mjs';
const root=process.cwd(),raw=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),key=r=>JSON.stringify([r.file,r.module,r.symbol]),clone=v=>structuredClone(v);
const line=JSON.parse(raw('compatibility/rc/menu-caller-worksheet.json')).line,q=qualifiedMenuContentTypeBoundary({line,readMember:raw});
const captured=JSON.parse(gunzipSync(raw('compatibility/rc/menu-caller-prior.json.gz'))),origin=JSON.parse(captured.ledgers.find(m=>m.path==='compatibility/f10/authored-dependency-current-dispositions.json').text).symbol_uses;
assert.equal(origin.length,315);const current=scanCurrentAuthoredUses({root}),frozen=JSON.parse(raw('compatibility/f10/authored-dependency-inventory-seed.json')).symbol_uses,wanted=new Map(current.symbol_uses.map(r=>[key(r),r]));
const retired={file:'legacy-menu/internal/menu-panel.ts',module:'@angular/material/menu',symbol:'MatMenuContent'},retiredKey=key(retired);assert.equal(wanted.has(retiredKey),false);
const observationsPath='compatibility/rc/removed-additional-validator-fixture.txt',observations=Buffer.from('Synthetic validator-only source/evidence binding fixture. This does not review any product route or qualify G11.'),reviewPath='compatibility/f10/authored-use-reviews/removed-additional-validator-fixture.json';
const rows=origin.map(r=>{const live=wanted.get(key(r));assert.ok(live||key(r)===retiredKey);return {...(live??{...retired,candidate_source_sha256:MENU_CONTENT_PANEL_AFTER,occurrences:[]}),status:'reviewed',disposition:'closed'};});
const review={schema_version:1,line,status:'reviewed',reviews:rows.map(r=>({...r,conclusion:key(r)===retiredKey?'owned-replacement':'stable-public-peer',reviewer:'Synthetic validator fixture;no product semantic claim',
 decision:'This synthetic case tests inventory cardinality,source and evidence binding only. It is not a substantive review of the product dependency or caller and must never be used as a G11 or release qualification.',independent_evidence:[{path:observationsPath,sha256:hash(observations)}]}))};
const reviewBytes=Buffer.from(JSON.stringify(review));for(const row of rows)row.source_review={path:reviewPath,sha256:hash(reviewBytes)};
const candidate={schema_version:1,line,status:'closed',current_uses:current.symbol_uses.length,current_source_files:current.source_files.length,current_source_population_sha256:current.source_population_sha256,
 symbol_use_count:315,live_symbol_use_count:314,retained_removed_additional_uses:[{...retired,qualification:q.ref}],symbol_uses:rows};
const members={[reviewPath]:reviewBytes,[observationsPath]:observations},read=(p,overrides={})=>Object.hasOwn(overrides,p)?overrides[p]:Object.hasOwn(members,p)?members[p]:raw(p);
const admit=(body=candidate,source=current,overrides={},fn=currentAuthoredUseAdmission)=>fn({current:source,frozen,candidate:body,line,readMember:p=>read(p,overrides)});
const positive=admit();assert.equal(positive.ready,true);assert.equal(positive.additional_uses,314);assert.equal(positive.additional_obligations,315);assert.equal(positive.retained_removed_additional_obligations,1);assert.equal(positive.inventory.expected,315);assert.equal(positive.review_evidence.reviewed,315);
let controls=0;function reject(body=candidate,source=current,overrides={}){const r=admit(body,source,overrides);assert.equal(r.ready,false);controls++;return r;}
const drop=clone(candidate);drop.symbol_uses=drop.symbol_uses.filter(r=>key(r)!==retiredKey);assert.equal(reject(drop).inventory.missing,1);
const shrink=clone(drop);shrink.symbol_use_count=314;assert.equal(reject(shrink).inventory.expected,315);
const metadataShrink=clone(shrink);metadataShrink.additionalBaseline=[];assert.equal(reject(metadataShrink).inventory.expected,315);
for(const value of [undefined,[],[{...retired,qualification:{...q.ref,sha256:'0'.repeat(64)}}],[...candidate.retained_removed_additional_uses,{file:'other.ts',module:'@angular/core',symbol:'Injector',qualification:q.ref}]]){const b=clone(candidate);if(value===undefined)delete b.retained_removed_additional_uses;else b.retained_removed_additional_uses=value;reject(b);}
let bad=clone(candidate);bad.symbol_uses.find(r=>key(r)===retiredKey).occurrences=[{kind:'named-import',local_name:'MatMenuContent',type_only:true,line:13}];reject(bad);
bad=clone(candidate);bad.symbol_uses.find(r=>key(r)===retiredKey).candidate_source_sha256=MENU_CONTENT_PANEL_BEFORE;reject(bad);
bad=clone(candidate);delete bad.symbol_uses.find(r=>key(r)===retiredKey).source_review;assert.equal(reject(bad).review_evidence.insufficient,1);
bad=clone(candidate);bad.symbol_uses.push(clone(bad.symbol_uses.find(r=>key(r)===retiredKey)));assert.equal(reject(bad).inventory.duplicates,1);
bad=clone(candidate);bad.symbol_uses[0].symbol='forged-outside';assert.equal(reject(bad).inventory.outside,1);
const liveKey=key(rows.find(r=>key(r)!==retiredKey));bad=clone(candidate);bad.symbol_uses=bad.symbol_uses.filter(r=>key(r)!==liveKey);bad.symbol_use_count=314;reject(bad);
const hidden=clone(current);hidden.symbol_uses=hidden.symbol_uses.filter(r=>key(r)!==liveKey);bad=clone(candidate);bad.symbol_uses=bad.symbol_uses.filter(r=>key(r)!==liveKey);bad.symbol_use_count=314;bad.live_symbol_use_count=313;bad.current_uses--;assert.equal(reject(bad,hidden).additional_baseline.valid,false);
const extra=clone(current);extra.symbol_uses.push({...current.symbol_uses[0],symbol:'new-unreviewed-route'});assert.equal(reject(candidate,extra).inventory.missing,1);
for(const[field,value]of [['symbol_use_count',314],['live_symbol_use_count',315],['current_uses',1965],['current_source_files',0],['current_source_population_sha256','0'.repeat(64)]]){bad=clone(candidate);bad[field]=value;reject(bad);}
for(const path of ['compatibility/rc/menu-caller-prior.json.gz',q.ref.path,'scripts/menu-caller-contracts.mjs'])reject(candidate,current,{[path]:Buffer.concat([raw(path),Buffer.from('\n')])});
const before=JSON.parse(raw('compatibility/rc/menu-panel-content-type-proposal.json')).diagnostic.before;reject(candidate,current,{[MENU_CONTENT_PANEL_SOURCE]:Buffer.from(before)});
const missing=clone(current);missing.source_files=missing.source_files.filter(m=>m.path!==MENU_CONTENT_PANEL_SOURCE);reject(candidate,missing);
reject(candidate,current,{[MENU_CONTENT_PANEL_SOURCE]:null});reject(candidate,current,{[observationsPath]:Buffer.from('changed fixture observation')});
let late=false;const lateRead=p=>late&&p===q.ref.path?Buffer.concat([raw(p),Buffer.from('\n')]):read(p);const delayed=()=>currentAuthoredUseAdmission({current,frozen,candidate,line,readMember:lateRead});assert.equal(delayed().ready,true);late=true;assert.equal(delayed().ready,false);
const temporary=mkdtempSync(join(tmpdir(),'retained-additional-mutants-'));let mutants=0;
try{
 const source=raw('scripts/authored-current-use-inventory.mjs').toString(),rewrite=s=>s.replace("from './authored-use-inventory.mjs'",'from '+JSON.stringify(pathToFileURL(join(root,'scripts/authored-use-inventory.mjs')).href)).replace("from './authored-additional-use-baseline.mjs'",'from '+JSON.stringify(pathToFileURL(join(root,'scripts/authored-additional-use-baseline.mjs')).href));
 for(const[id,from,to,forged]of [
  ['forgotten-original-roster','new Map(baseline.entries.map(row => [key(row), row]))','new Map()',shrink],
  ['ignored-qualification-validity','const scopeValid = baseline.valid && !baselineOverlapsFrozen','const scopeValid = !baselineOverlapsFrozen',(()=>{const b=clone(candidate);delete b.retained_removed_additional_uses;return b;})()],
 ]){assert.equal(source.split(from).length,2);const path=join(temporary,id+'.mjs');writeFileSync(path,rewrite(source.replace(from,to)));const module=await import(pathToFileURL(path));assert.equal(admit(forged,current,{},module.currentAuthoredUseAdmission).ready,true,id+' did not expose the regression');mutants++;}
}finally{rmSync(temporary,{recursive:true,force:true});}
const report={line,current_live_uses:1964,live_additional_uses:314,retained_additional_obligations:315,retained_removed_obligations:1,positive_complete_validator_fixture:true,admission_controls_rejected:controls,late_changes_rejected:1,actual_admission_mutants_detected:mutants,
 supplied_candidate_metadata_cannot_shrink_original_roster:true,synthetic_review_records_written_to_canonical_ledgers:false,product_semantic_or_G11_qualification:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
