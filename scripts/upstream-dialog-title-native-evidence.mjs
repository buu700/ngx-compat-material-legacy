/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Mandatory native title observations; source-only diagnostics cannot qualify them. */
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {isDeepStrictEqual} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {validateBrowserMatrixRun} from './upstream-browser-run-evidence.mjs';
import {legacyDialogTitleLifetimeNativeOkay} from './dialog-title-lifetime-fixture.mjs';
const require=createRequire(import.meta.url);
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const demand=(value,message)=>{if(!value)throw new Error(message);};
const MARKER='mat-dialog-container; rendered component/template OnPush title lifetimes ';
export function dialogTitleBrowserObservedOkay(observation,caseIds){
 if(!observation||!Array.isArray(observation.cases)||!Array.isArray(caseIds)||caseIds.length!==6||new Set(caseIds).size!==6)return false;
 for(const case_id of caseIds){
  const rows=observation.cases.filter(row=>row?.case_id===case_id);if(rows.length!==1)return false;
  const row=rows[0];if(row.result!=='pass'||typeof row.evidence!=='string'||!row.evidence.startsWith(MARKER))return false;
  try{if(!legacyDialogTitleLifetimeNativeOkay(JSON.parse(row.evidence.slice(MARKER.length))))return false;}catch{return false;}
 }
 return true;
}
export function validateDialogTitleNative({root,entry,proof,request}){
 try{
  const owner=require('./upstream-dialog-title-admission.cjs'),requirements=owner.titleNativeRequirements();
  demand(entry?.sha===owner.TITLE_SHA&&proof?.proof_kind===owner.TITLE_KIND&&proof.diff_sha256===owner.TITLE_DIFF,'unregistered title native subject');
  demand(request?.line==='21.x'&&isDeepStrictEqual(proof.affected_branches,['21.x']),'wrong title native line');
  demand(isDeepStrictEqual(proof.historical_behavior,requirements),'missing mandatory title native scope');
  const source=readEvidenceMember(root,owner.TITLE_SOURCE_REPORT);
  demand(hash(source)===owner.TITLE_SOURCE_HASH,'changed title native source contract');
  // The source contract binds the fixture, predicates, both run validators and
  // current product graph. The integration stage separately owns routing code.
  for(const member of JSON.parse(source).input_members.filter(row=>!row.path.startsWith('node_modules/'))){
   const bytes=readEvidenceMember(root,member.path);demand(bytes.length===member.bytes&&hash(bytes)===member.sha256,'stale title native input');
  }
  const browser=validateBrowserMatrixRun({root,request});demand(browser.ok,browser.detail);
  demand(dialogTitleBrowserObservedOkay(browser.observation,requirements.case_ids),'insufficient six-cell native title observations');
  return {ok:true,detail:'Complete same-run browser prerequisites and42rendered title observations in each of six engine/runtime cells verified; final sealing remains separate.',
   invocation_id:browser.invocation_id,output:browser.output,library:browser.library,packed_consumer:browser.packed_consumer,
   required_case_ids:requirements.case_ids,required_observation_rows_per_case:42};
 }catch(error){return {ok:false,detail:error.message};}
}
