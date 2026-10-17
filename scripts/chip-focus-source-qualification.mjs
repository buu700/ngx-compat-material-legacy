/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current raw source context refresh only; no disposition or runtime closure. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {modernChipSourceContext,modernChipSourceProof,modernChipScopeEvidenceOk} from './upstream-modern-chip-scope.mjs';
import {chipEditSourceBody,chipEditSourceProof,chipEditScopeEvidenceOk} from './upstream-chip-edit-scope.mjs';
import {chipInputApiSourceBody,chipInputApiSourceProof,chipInputApiScopeEvidenceOk} from './upstream-chip-input-api-scope.mjs';
import {chipModernizationSourceBody,chipModernizationSourceProof,chipModernizationScopeEvidenceOk} from './upstream-chip-modernization-scope.mjs';
import {candidateProductSourcePaths} from './upstream-candidate-source-evidence.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),json=v=>JSON.stringify(v,null,2)+'\n';
export const CHIP_FOCUS_SOURCE_PRIOR='compatibility/rc/chip-focus-source-qualification-prior.json.gz';
const pins={main:'bbf4f2de64ae45c3fcbf4ab8a1cc8b5def15a0de001035b50919635b65f63ad2','21.x':'6bda53d7e4d1f20b8a0ccde507d39c1492016eeba03d76e96772ffb0db17f973'};
function freeze(v){if(v&&typeof v==='object'){for(const c of Object.values(v))freeze(c);Object.freeze(v);}return v;}
const cache=new Map();
export function chipFocusSourcePrior(read=p=>readFileSync(p)){
 const bytes=read(CHIP_FOCUS_SOURCE_PRIOR),pin=hash(bytes),line=Object.keys(pins).find(k=>pins[k]===pin);assert.ok(line,'changed focus source qualification prior');if(cache.has(line))return cache.get(line);
 const p=JSON.parse(gunzipSync(bytes));assert.equal(p.line,line);assert.equal(hash(p.ledger_text),p.ledger_sha256);assert.equal(JSON.parse(p.ledger_text).entries.length,1697);assert.equal(p.entries.length,12);
 for(const m of [...p.reviews,...p.sources,...p.authored_stores,...p.authored_reviews])assert.equal(hash(m.text),m.sha256);cache.set(line,freeze(p));return cache.get(line);
}
export const CHIP_FOCUS_SOURCE_APIS=Object.freeze({
 'modern-chip':{context:modernChipSourceContext,proof:modernChipSourceProof,validate:modernChipScopeEvidenceOk},
 'chip-edit':{body:chipEditSourceBody,proof:chipEditSourceProof,validate:chipEditScopeEvidenceOk},
 'chip-input-api':{body:chipInputApiSourceBody,proof:chipInputApiSourceProof,validate:chipInputApiScopeEvidenceOk},
 'chip-modernization':{body:chipModernizationSourceBody,proof:chipModernizationSourceProof,validate:chipModernizationScopeEvidenceOk},
});
export function chipFocusCurrentSourceBodies({root=process.cwd(),read=p=>readFileSync(join(root,p))}={}){
 const prior=chipFocusSourcePrior(read),paths=candidateProductSourcePaths(root).sort();
 return prior.units.map(unit=>{
  const old=JSON.parse(prior.reviews.find(m=>m.path===unit.prior_report).text),api=CHIP_FOCUS_SOURCE_APIS[unit.unit];let body;
  if(unit.unit==='modern-chip'){
   body=structuredClone(old);body.candidate_context=api.context(read,paths);
   body.previous_source_requalifications=[...(old.previous_source_requalifications??[]),old.source_requalification];
   body.source_requalification={kind:'current-owned-focus-source-epoch',prior:{path:CHIP_FOCUS_SOURCE_PRIOR,sha256:pins[prior.line]},previous_report:{path:unit.prior_report,sha256:prior.reviews.find(m=>m.path===unit.prior_report).sha256},previous_context_sha256:hash(JSON.stringify(old.candidate_context)),current_context_sha256:hash(JSON.stringify(body.candidate_context)),source_scope_only:true,actual_native_packed_or_floor_qualified:false};
  }else body=api.body(read,paths,prior.line);
  assert.deepEqual(body.reviews,old.reviews,'individual original source judgment changed '+unit.unit);
  return {unit:unit.unit,shas:unit.shas,prior_report:unit.prior_report,path:'compatibility/rc/chip-focus-source-qualification-'+unit.unit+'.json',body};
 });
}
export function inspectChipFocusSourceQualification({root=process.cwd(),read=p=>readFileSync(join(root,p))}={}){
 const prior=chipFocusSourcePrior(read),ledger=JSON.parse(read(prior.ledger_path)),generated=chipFocusCurrentSourceBodies({root,read}),paths=candidateProductSourcePaths(root).sort(),subjects=[];
 for(const unit of generated){const bytes=read(unit.path);assert.equal(bytes.toString(),json(unit.body),'different current source body');
  for(const sha of unit.shas){const entry=ledger.entries.find(e=>e.sha===sha),previous=prior.entries.find(e=>e.sha===sha);assert.equal(entry.final_disposition,previous.final_disposition);assert.equal(entry.reason,previous.reason);assert.equal(entry.evidence_report,unit.path);assert.equal(CHIP_FOCUS_SOURCE_APIS[unit.unit].validate(unit.body,entry,read,paths,prior.line),true,sha);subjects.push({sha,unit:unit.unit,evidence_report:unit.path,sha256:hash(bytes)});}
 }
 for(const m of [...prior.reviews,...prior.authored_stores,...prior.authored_reviews])assert.equal(hash(read(m.path)),m.sha256,'changed retained source/role report '+m.path);
 const population=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--','projects','testing','reference','fixtures'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean).sort();assert.deepEqual(population,prior.product_members.map(m=>m.path).sort());
 for(const m of prior.product_members)assert.equal(hash(read(m.path)),m.sha256,'unreviewed product/reference/fixture edit '+m.path);
 return {schema_version:1,line:prior.line,current_source_subjects:subjects,source_bodies:generated.map(({unit,path})=>({unit,path,sha256:hash(read(path))})),all1697_dispositions_preserved:true,existing_role_documents_unchanged:prior.authored_reviews.length,product_reference_fixture_members_preserved:prior.product_members.length,new_semantic_closures:0,actual_native_packed_or_floor_qualified:false,current_native_role_and_history_requalification_pending:true,g11_claim:'not-passed'};
}
