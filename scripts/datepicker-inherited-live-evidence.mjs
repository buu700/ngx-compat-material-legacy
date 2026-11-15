/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {isDeepStrictEqual as eq} from 'node:util';
import {evaluateDatepickerRows} from '../testing/datepicker-inherited/contracts-fixture.mjs';
export const DATEPICKER_SHAS=Object.freeze(['0d36e863ba6752596b6cee5810b5d953d536a9a9','2d5942cb0fe86f9c3d26b1925b1d4390cfc6613b','5db8dca18b5967c203a5898dfa713ff03d9e7134','e8b28fa6ba15f536e72d13c0b22765924efaf1f6']);
const need=(v,m)=>{if(!v)throw Error(m)};
export function datepickerCaseResults(results,nonce){return Object.fromEntries(DATEPICKER_SHAS.map(sha=>[sha,Object.fromEntries(['zoneless','zoneful'].map(mode=>[mode,evaluateDatepickerRows(sha,results?.[mode]?.rows,nonce)]))]));}
export function verifyDatepickerLiveBody(body,{binding,runId,invocation,library,profile}){
 need(body&&body.kind==='datepicker-inherited-live-native'&&body.run_id===runId&&body.invocation_id===invocation&&eq(body.binding,binding),'wrong run or invocation');
 need(body.source_commit===binding.source_commit&&body.source_tree===binding.source_tree&&body.artifact_sha256===library.sha256,'wrong source or artifact');
 need(/^[a-f0-9]{64}$/.test(body.nonce)&&body.toolchain_profile===profile.id&&body.toolchain_record_sha256===profile.recordHash&&body.fixture_exit_code===0&&body.fixture_signal===null,'wrong nonce/profile/child outcome');
 need(eq(Object.keys(body.results||{}).sort(),['zoneful','zoneless']),'wrong modes');
 for(const mode of ['zoneless','zoneful']){const d=body.results[mode];need(d?.browser===profile.browser_product&&d.rows?.nonce===body.nonce&&d.tooling?.ngcStatus===0&&d.tooling?.ngcSignal===null&&d.tooling?.linked>0,'wrong browser or AOT result');need(Array.isArray(d.bundle_inputs)&&d.bundle_inputs.length>0,'missing actual bundle inputs');}
 need(body.results.zoneless.package_inventory_sha256===body.results.zoneful.package_inventory_sha256,'different packages between modes');
 const cases=datepickerCaseResults(body.results,body.nonce);need(eq(body.all_cases,cases),'case results do not match raw observations');return cases;
}
// Only evidence explicitly returned by the finite validator can enter the
// roster. Conflicting copies fail closed. Failed subject results are retained.
export function datepickerOutputRecords(rows,runId,invocation){
 const records=new Map();for(const row of rows||[]){if(row?.execution!=='live-packed-native-datepicker')continue;
  need(typeof row.output==='string'&&/^datepicker-live-[a-f0-9]{64}\.json$/.test(row.output)&&row.output===`datepicker-live-${row.nonce}.json`&&/^[a-f0-9]{64}$/.test(row.sha256)&&Number.isSafeInteger(row.bytes)&&row.bytes>0&&row.run_id===runId&&row.invocation_id===invocation,'wrong live output identity');
  const item={path:`evidence/upstream-audit-disposition/${invocation}/${row.output}`,sha256:row.sha256,bytes:row.bytes};const old=records.get(item.path);need(!old||eq(old,item),'conflicting live output');records.set(item.path,item);
 }return [...records.values()];
}
