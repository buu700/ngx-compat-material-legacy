/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact source/API boundaries and preparation-stage metadata preservation. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,isAbsolute} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {tableCoercionFacts,tableCoercionPublicModels,inspectTableCoercionReview,TABLE_COERCION_PRIOR,TABLE_COERCION_REVIEW} from '../scripts/table-coercion-caller-roles.mjs';
import {coercionBehavior} from '../scripts/coercion-pure-use-review.mjs';
const root=process.cwd(),read=p=>readFileSync(isAbsolute(p)?p:join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),{prior,facts}=tableCoercionFacts({root});
const integrated=process.argv.includes('--integrated'),identity=r=>JSON.stringify([r.file,r.module,r.symbol]);
function canonical(body,readMember){
 const ref={path:TABLE_COERCION_REVIEW,sha256:hash(readMember(TABLE_COERCION_REVIEW))};
 for(const [i,m]of prior.ledgers.entries()){
  const actual=JSON.parse(readMember(m.path)),rows=i===0?actual.entries:actual.symbol_uses;assert.equal(rows.length,[1697,1736,315][i]);
  if(!integrated)assert.equal(hash(readMember(m.path)),m.sha256,'preparation changed a canonical ledger');
  if(i!==2)continue;
  for(const selected of prior.selected){
   const before=selected.original_row,now=rows.find(r=>identity(r)===identity(before));assert.ok(now);
   const expected=integrated?{...before,status:'reviewed',disposition:'closed',source_review:ref}:before;
   assert.equal(isDeepStrictEqual(now,expected),true,'unregistered table coercion canonical transition');
  }
 }
}
async function inspect(readMember=read){const body=await inspectTableCoercionReview({root,read:readMember});canonical(body,readMember);return body;}
const body=await inspect();assert.equal(body.reviews.length,3);assert.equal(facts.reduce((n,f)=>n+f.setters.length,0),6);assert.equal(body.public_subjects.length,3);assert.deepEqual(body.public_behavior.map(b=>b.boolean_cases),[42,42]);assert.ok(body.public_subjects.every(s=>s.stable_public_export&&s.signature==='(value: any): boolean'));
const subjects=JSON.parse(read('compatibility/rc/coercion-public-subjects.json'));
const paths=[...new Set([TABLE_COERCION_PRIOR,TABLE_COERCION_REVIEW,'scripts/table-coercion-caller-roles.mjs',...prior.sources.map(m=>m.path),...prior.evidence.map(m=>m.path),...(integrated?[]:prior.ledgers.map(m=>m.path)),...subjects.subjects.flatMap(s=>s.members.map(m=>join(s.runtime_root,m.path))),...subjects.subjects.flatMap(s=>s.declarations.map(m=>m.path))])];
for(const path of paths){const bytes=Buffer.concat([read(path),Buffer.from('\n')]);await assert.rejects(inspect(p=>p===path?bytes:read(p)),e=>e?.code==='ERR_ASSERTION',path);}
let changed=false;const path=prior.sources[0].path,bad=Buffer.concat([read(path),Buffer.from('\n')]),late=p=>changed&&p===path?bad:read(p);await inspect(late);changed=true;await assert.rejects(inspect(late),e=>e?.code==='ERR_ASSERTION');
const publicModels=await tableCoercionPublicModels({root}),tag=publicModels.models.find(m=>m.line==='original').runtime,faults=[];
for(const [id,fn]of [
 ['truthiness',value=>Boolean(value)],
 ['loose-false',value=>value!=null&&value!='false'],
 ['String-symbol-handling',value=>value!=null&&String(value)!=='false'],
]){assert.throws(()=>coercionBehavior({...tag,coerceBooleanProperty:fn},tag),e=>e?.code==='ERR_ASSERTION');faults.push(id);}
const report={schema_version:1,line:prior.line,individual_caller_roles:3,complete_current_setters:6,public_tagged_and_minimum_namespaces:3,genuine_boolean_cases_each:42,source_and_evidence_corruptions_rejected:paths.length,late_source_change_rejected:true,boolean_behavior_faults_rejected:faults,canonical_closures_integrated:integrated?3:0,all_canonical_ledger_bytes_preserved:!integrated,all1697_SHA_1736_frozen_315_additional_obligations_retained:true,strict_consumer_AOT_executed:false,actual_table_parent_constructor_or_native_behavior_qualified:false,borrowed_Core_module_has_no_full_peer_floor_credit:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
