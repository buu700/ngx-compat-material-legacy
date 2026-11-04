/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Execute shipped current source admission on actual317obligations,with no old roster reader. */
import assert from 'node:assert/strict';
import {writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {readHistoricalContractRepairOwnerMember} from '../../scripts/historical-contract-repair-readers.mjs';
import {scanCurrentAuthoredUses,currentAuthoredUseAdmission} from '../../scripts/authored-current-use-inventory.mjs';
import {authoredUseReviewEvidence} from '../../scripts/authored-use-inventory.mjs';
const root=process.cwd(),prefix='compatibility/rc/snack-current-owner-repair-',out=process.argv[2],start=performance.now(),hash=b=>createHash('sha256').update(b).digest('hex');assert.ok(out?.startsWith(prefix));assert.equal(existsSync(out),false);Error.stackTraceLimit=30;
const report={schema_version:1,source_scope_only:true,full_snack_owner_or_canonical_audit_admission_qualified:false,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
try{
 const cache=new Map(),physical=p=>readHistoricalContractRepairOwnerMember(root,p),read=p=>{if(!cache.has(p))cache.set(p,physical(p));return Buffer.from(cache.get(p));};
 const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version,line=version.startsWith('21.')?'21.x':'main';
 const frozenPath='compatibility/f10/authored-dependency-dispositions.json',additionalPath='compatibility/f10/authored-dependency-current-dispositions.json',frozen=JSON.parse(read(frozenPath)),additional=JSON.parse(read(additionalPath)),current=scanCurrentAuthoredUses({root,readSource:read});
 assert.equal(frozen.symbol_uses.length,1736);assert.equal(additional.symbol_uses.length,317);assert.equal(current.symbol_uses.length,1965);assert.equal(current.source_files.length,532);
 const admission=currentAuthoredUseAdmission({current,frozen:frozen.symbol_uses,candidate:additional,line,readMember:read});
 report.admission=admission;assert.equal(admission.ready,true,JSON.stringify(admission));assert.equal(admission.additional_obligations,317);assert.equal(admission.additional_uses,315);assert.equal(admission.retained_removed_additional_obligations,2);assert.equal(admission.review_evidence.reviewed,317);assert.equal(admission.review_evidence.insufficient,0);
 const frozenEvidence=authoredUseReviewEvidence(frozen,line,read,hash);assert.equal(frozenEvidence.reviewed,1736);assert.equal(frozenEvidence.insufficient,0);
 for(const [p,b]of cache){assert.ok(physical(p).equals(b),'late current source/admission input '+p);}
 Object.assign(report,{status:'pass',line,current_roster_images:[frozenPath,additionalPath].map(p=>({path:p,sha256:hash(read(p)),bytes:read(p).length})),current_source_population_sha256:current.source_population_sha256,frozen_review_evidence:frozenEvidence,physical_read_members:cache.size,explicit_additional_baseline_override_supplied:false,historical_roster_reader_supplied:false,all_bound_current_inputs_rechecked:true,current_authored_source_admission_qualified:true,new_mutation_matrix_executed:false});
}catch(e){Object.assign(report,{status:'rejected',error:e.stack});process.exitCode=1;}
report.seconds=(performance.now()-start)/1000;writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,line:report.line,seconds:report.seconds,error:report.error}));
