/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current packed constructor/provider admission for the single historical decision. */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {readEvidenceMember,validatePackedConsumerRun} from './upstream-packed-run-evidence.mjs';
import {NATIVE_DATE_CONSTRUCTOR_CASE_ID,NATIVE_DATE_PROVIDER_CASE_ID,
  packedNativeDateConstructorCase,packedNativeDateProviderCase} from './native-date-packed-contract.mjs';
export const NATIVE_DATE_SHA='b423c0e0b754b1f1d118d17e022981c357c3aa68';
export const NATIVE_DATE_KIND='packed-required-individual-native-date';
const patch='0fc17a9693eca8bb91cf85b9e1bd5129acf63ccc8a761482a7e8e2ba5d9dd31d';
const kind='owned-original-native-date-constructor-and-isolated-providers';
const caseIds=[NATIVE_DATE_CONSTRUCTOR_CASE_ID,NATIVE_DATE_PROVIDER_CASE_ID];
const tagged='reference/material-16.2.14/datetime/native-date-adapter.ts';
const owned='projects/ngx-material-legacy/legacy-core/internal/datetime/native-date-adapter.ts';
const members=[
  'scripts/upstream-native-date-evidence.mjs','scripts/check-upstream-audit-disposition.mjs',
  'scripts/upstream-packed-run-evidence.mjs','scripts/packed-consumer-evidence.mjs',
  'scripts/packed-consumer-aot-smoke.mjs','scripts/native-date-packed-fixture.mjs',
  'scripts/native-date-packed-contract.mjs','compatibility/rc/matrices/full-verify.json',
  'compatibility/rc/matrices/library-exports.json','projects/ngx-material-legacy/package.json',
  owned,'projects/ngx-material-legacy/legacy-core/internal/datetime/native-date-module.ts',
  'projects/ngx-material-legacy/legacy-core/public-api.ts',tagged,
  'reference/material-16.2.14/datetime/source-provenance.json',
  'reference/material-16.2.14/factory-metadata.json',
  'compatibility/f10/disposition-ledger/evidence/closeout-native-date-source-review.json',
  'compatibility/f10/disposition-ledger/evidence/patches/'+NATIVE_DATE_SHA+'.patch',
];
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const demand=(value,message)=>{if(!value)throw Error(message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
const sameIds=(actual,expected)=>Array.isArray(actual)&&actual.length===expected.length
  &&new Set(actual).size===actual.length&&actual.every(value=>expected.includes(value));
export function nativeDateRequirements(sha){
  return sha===NATIVE_DATE_SHA?structuredClone({kind,patch,members,case_ids:caseIds}):null;
}
export function requiresNativeDate(entry,proof){
  return entry?.sha===NATIVE_DATE_SHA||proof?.proof_kind===NATIVE_DATE_KIND
    ||(object(proof)&&Object.hasOwn(proof,'native_date_behavior'));
}
/** An old job ID, source decision or pair of passing labels cannot replace the
 * current complete packed run. Execution authenticity and release gates remain
 * the coordinator/final sealer's responsibility. */
export function validateNativeDate({root,entry,proof,request}){
  try{
    demand(entry?.sha===NATIVE_DATE_SHA&&entry.final_disposition==='do-not-adopt'
      &&proof?.proof_kind===NATIVE_DATE_KIND&&proof.diff_sha256===patch,'unregistered native date subject');
    const scope=proof.native_date_behavior;
    demand(object(scope)&&scope.kind===kind&&isDeepStrictEqual(scope.case_ids,caseIds),'wrong native date scope');
    const version=JSON.parse(readEvidenceMember(root,'projects/ngx-material-legacy/package.json')).version;
    const line=/^22\./.test(version)?'main':/^21\./.test(version)?'21.x':null;
    demand(line&&isDeepStrictEqual(proof.affected_branches,[line]),'wrong native date source branch');
    demand(Array.isArray(scope.source_members)&&sameIds(scope.source_members.map(row=>row?.path),members),'incomplete native date source scope');
    for(const member of scope.source_members)demand(/^[0-9a-f]{64}$/.test(member.sha256)
      &&hash(readEvidenceMember(root,member.path))===member.sha256,'stale native date source member');
    const original=readEvidenceMember(root,tagged);
    demand(hash(original)==='9764348262387bc4d76f3c1724620074288167e8d2b13ebd5e109bab23f8e797','changed original native date source');
    const expected=original.toString().replace('Copyright Google LLC All Rights Reserved.',
      'Copyright Google LLC All Rights Reserved.\n * Copyright (c) 2026 Ryan Lester.')
      .replace("from './date-adapter'","from '@angular/material/core'")
      .replace('class NativeDateAdapter','class LegacyNativeDateAdapter');
    demand(readEvidenceMember(root,owned).toString()===expected,'changed original native date algorithm or constructor');
    const runtime=validatePackedConsumerRun({root,request});demand(runtime.ok,runtime.detail);
    const raw=runtime.observation.extra?.harness;
    demand(object(raw)&&raw.ok===true,'missing successful native date harness result');
    for(const [id,field,legacy,evaluate]of [
      [NATIVE_DATE_CONSTRUCTOR_CASE_ID,'nativeDateConstructorObservation','nativeDateConstructor',packedNativeDateConstructorCase],
      [NATIVE_DATE_PROVIDER_CASE_ID,'nativeDateProviderObservation','nativeDateProvider',packedNativeDateProviderCase],
    ]){
      const selected=runtime.observation.cases.find(row=>row.case_id===id);
      demand(selected&&selected.result==='pass'&&selected.legacy_harness_passed===true&&raw[legacy]===true
        &&isDeepStrictEqual(raw[field],selected.observation)&&evaluate(selected.observation).result==='pass',
      'insufficient current native date constructor/provider observations');
    }
    return {ok:true,detail:'Original constructor and algorithm retained; direct/subclass calendar and isolated provider/format/token observations passed in this same complete packed run. Actual floor certification, full G11 and final sealing remain separate.',
      invocation_id:runtime.invocation_id,output:runtime.output,library:runtime.library,required_cases:[...caseIds]};
  }catch(error){return {ok:false,detail:error.message};}
}
