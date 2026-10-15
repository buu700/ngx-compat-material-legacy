/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export const RADIO_IDENTITY_CASE_ID='packed-consumer/harness/radio-generated-identity-coexistence';

/** Require real serialized Angular/node observations; synthetic controls only test admission. */
export function packedRadioIdentityCase(observed){
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),unique=values=>Array.isArray(values)&&values.length===6&&values.every(value=>typeof value==='string'&&value.length>0)&&new Set(values).size===6;
 const initial=observed?.initial,rows=observed?.transitions;
 const stages=[['legacy-b','b','a'],['peer-c','b','c'],['legacy-a','a','c'],['shared-peer-b',null,'b'],['shared-legacy-b','b',null],['restored-independent','b','c']];
 const identities=['owned_group','owned_buttons','peer_group','peer_buttons','dispatcher_shared','generations_distinct'];
 const structure=['label','container','outer_circle','inner_circle','label_content','input_class'];
 const okay=observed?.execution==='packed-angular-testbed-dom'&&observed.error===null&&observed.scopes_separate===true
   &&identities.every(key=>observed.identities?.[key]===true)
   &&Array.isArray(initial?.group_names)&&initial.group_names.length===2&&initial.group_names.every(name=>typeof name==='string'&&name.length>0)&&initial.group_names[0]!==initial.group_names[1]
   &&unique(initial?.host_ids)&&unique(initial?.input_ids)&&new Set([...initial.host_ids,...initial.input_ids]).size===12
   &&Array.isArray(initial?.links)&&initial.links.length===6&&initial.links.every((link,index)=>link.host_id===initial.host_ids[index]&&link.input_id===initial.input_ids[index]&&link.input_id===link.host_id+'-input'&&link.label_for===link.input_id&&link.native_name===initial.group_names[index<2?0:1])
   &&initial.host_ids[1]==='packed-legacy-explicit'&&initial.input_ids[1]==='packed-legacy-explicit-input'
   &&Array.isArray(initial?.legacy_structure)&&initial.legacy_structure.length===2&&initial.legacy_structure.every(row=>structure.every(key=>row[key]===true))
   &&same(initial?.selection,{legacy:'a',peer:'a',legacy_native:'a',peer_native:'a'})
   &&Array.isArray(rows)&&rows.length===stages.length&&rows.every((row,index)=>{const [stage,legacy,peer]=stages[index];return row?.stage===stage&&row.legacy===legacy&&row.peer===peer&&row.legacy_native===legacy&&row.peer_native===peer;})
   &&observed.explicit?.group_name==='packed-radio-shared'&&same(observed.explicit.legacy_names,['packed-radio-shared','packed-radio-shared'])&&same(observed.explicit.peer_names,Array(4).fill('packed-radio-shared'))
   &&observed.explicit.host_id==='packed-legacy-explicit'&&observed.explicit.input_id==='packed-legacy-explicit-input'&&observed.explicit.label_for==='packed-legacy-explicit-input'
   &&observed.destroy?.fixture_destroyed===true&&observed.destroy.notified_distinct_names===2
   &&same(observed.destroy.checked_before,[false,true,false,false,true,false])&&same(observed.destroy.checked_after,observed.destroy.checked_before);
 return {case_id:RADIO_IDENTITY_CASE_ID,result:okay?'pass':'fail',observation:observed??null,failure:okay?null:'Missing or failed packed Angular mixed-generation radio identities/selection/labels/cleanup'};
}
