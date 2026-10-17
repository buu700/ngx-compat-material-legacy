/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete observations for the two existing constructor/provider cells. */
export const NATIVE_DATE_CONSTRUCTOR_CASE_ID='packed-consumer/harness/native-date-constructor';
export const NATIVE_DATE_PROVIDER_CASE_ID='packed-consumer/harness/native-date-provider';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const demand=value=>{if(!value)throw Error('Incomplete native date observations');};
function result(caseId,observed,inspect,failure){
 let okay=false;try{inspect(observed);okay=true;}catch{/* Incomplete/status-only results fail. */}
 return {case_id:caseId,result:okay?'pass':'fail',observation:observed??null,failure:okay?null:failure};
}
export function packedNativeDateConstructorCase(observed){
 return result(NATIVE_DATE_CONSTRUCTOR_CASE_ID,observed,o=>{
  demand(o?.execution==='packed-angular-testbed'&&o.error===null&&o.phase==='before-provider-configuration'&&o.outside_injection_context===true);
  const d=o.direct,s=o.subclass;
  demand(d?.owned_adapter===true&&d.public_base===true&&d.locale_format==='01/02/2024');
  demand(same(d.small_year,[7,1,28])&&same(d.month_clamp,[2023,1,28])&&same(d.leap_year_clamp,[2025,1,28]));
  demand(d.first_weekday===0&&d.leap_month_days===29&&d.invalid_valid===false&&same(d.deserialized_utc,[2024,1,29]));
  demand(d.clone?.distinct===true&&d.clone.same_time===true&&d.clone.source_unchanged===true);
  demand(s?.owned_adapter===true&&s.consumer_subclass===true&&s.public_base===true&&s.locale_format==='02/01/2024'&&same(s.leap_date,[2024,1,29]));
 },'Missing outside-DI direct/subclass construction, original locale or independent calendar/clone/invalid/deserialize observations');
}
export function packedNativeDateProviderCase(observed){
 return result(NATIVE_DATE_PROVIDER_CASE_ID,observed,o=>{
  demand(o?.execution==='packed-angular-testbed'&&o.error===null&&o.reset_count===3&&o.isolated_adapters_distinct===true);
  demand(o.token_identity?.date_adapter===true&&o.token_identity.locale===true&&o.token_identity.formats===true&&o.token_identity.native_formats===true);
  const expected=[['legacy-only','en-US','01/02/2024','absent'],['legacy-formats','en-GB','02/01/2024','native'],['formats-override','en-GB','02/01/2024','custom']];
  demand(Array.isArray(o.scopes)&&o.scopes.length===expected.length);
  for(const[i,[name,locale,formatted,formats]]of expected.entries()){
   const s=o.scopes[i];demand(s?.scope===name&&s.requested_locale===locale&&s.owned_adapter===true&&s.public_base===true);
   demand(s.singleton===true&&s.distinct_from_manual===true&&s.locale_reads===1&&s.platform_reads===1&&s.formats===formats);
   demand(s.formatted===formatted&&same(s.leap_date,[2024,1,29]));
  }
 },'Missing isolated module/format override, exact public token identity, locale/Platform factory reads or provider lifetime observations');
}
