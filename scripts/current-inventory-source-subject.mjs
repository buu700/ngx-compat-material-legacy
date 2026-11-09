/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite routing paths; before-images are comparison data only. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
const SELF='scripts/current-inventory-source-subject.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const PACKET={path:'compatibility/rc/main-current-inventory-source-routing-v2.json',sha256:'3815beb1e21779e54deaee5da2bf7bb316732e98a3dc9938ef6d2fdf18707280',bytes:24306};
const CONTINUATION={path:'compatibility/rc/main-current-inventory-source-routing-v3.json',sha256:'d533e0e694d406ec9968b4748fb9da4a846a88df413fa800bae384403ea3402b',bytes:13219};
const LATE_CONTINUATION={path:'compatibility/rc/main-current-inventory-source-routing-v4.json',sha256:'b4d4fc742323ec0bb6858a5b6165dc0c1307d0d0a1d4c3f49b6ef017df97ab1c',bytes:32578};
const IDENTITY_CONTINUATION={path:'compatibility/rc/main-current-inventory-source-routing-v5.json',sha256:'47061b1a2794efe6c735d5bf7805ae79f00e96eb1454918bbf27555d4202616c',bytes:3548};
const WRAPPER_CONTINUATION={path:'compatibility/rc/main-current-inventory-source-routing-v6.json',sha256:'233fa6a574a7124c0e1cc41bec2b307ae5d7517ae1e6e3f09e1b614e9c05f9a1',bytes:8161};
const TEST_CONTINUATION={path:'compatibility/rc/main-current-inventory-source-routing-v7.json',sha256:'6988117f3e1da0fcd53c5993b2402d997464775155b2310462ecd1dab3148f9a',bytes:2037};
const SASS_CONTINUATION={path:'compatibility/rc/main-current-inventory-source-routing-v8.json',sha256:'b45853d028402964a7b08c79b38c80991a65d623e84aae7d1ae0121cc9d8bd9c',bytes:24734};
const wrapperBefore=[{path:'scripts/sass-wrapper-notice-metadata.mjs',sha256:'624093a294bbfaf06b66eeb54a81fb10c71140624d80e82620c1210586aa89aa',bytes:8020},{path:'scripts/historical-chip-wrapper-metadata.mjs',sha256:'f9e5fa9808a1553c216a95de42d6a3d251aac01d0066b87c8e630cb2d7d34a0e',bytes:11824}];
const wrapperAnchors=[{path:wrapperBefore[0].path,packet:{path:'compatibility/rc/sass-wrapper-notice-ledger-successor.json',sha256:'7f5f042a3c45b96c3f128c454d71acc9bc059d96be8d5cc927b99296ed5d565e',bytes:144768}},{path:wrapperBefore[1].path,packet:{path:'compatibility/rc/historical-chip-source-wrapper-ledger-successor.json',sha256:'3e8a3e66ae603768d60d22f646b19ec283e6c599b0df5274363533a7d70efd30',bytes:57256}}];
const paths=['scripts/packed-upstream-ledger-epoch.mjs','scripts/inventory-reference-owner.mjs','scripts/inventory-finite-tool-successor.mjs','scripts/historical-repair-live-source-successor.mjs'];
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function currentInventorySourceSubject({root,read=p=>readEvidenceMember(root,p)}){
 const physical=p=>readEvidenceMember(root,p),check=(raw,ref)=>{assert.equal(hash(raw),ref.sha256,ref.path);assert.equal(raw.length,ref.bytes,ref.path);};
 assert.equal(typeof read,'function');assert.ok(physical(SELF).equals(image));assert.ok(JSON.parse(physical('projects/ngx-material-legacy/package.json')).version.startsWith('22.'));
 const raw=physical(PACKET.path);check(raw,PACKET);const packet=JSON.parse(raw);
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'main-current-inventory-source-routing');assert.equal(packet.base_head,'54aa9b85bdd38c1ebb93ce2eeaeee34f39161cc0');assert.equal(packet.source_scope_only,true);assert.equal(packet.historical_programs_executed,false);assert.equal(packet.historical_packets_rewritten,false);assert.equal(packet.artifact_or_audit_admission_granted,false);assert.equal(packet.g11_claim,'not-passed');assert.deepEqual(packet.updates.map(row=>row.path),paths);
 const env={PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'};
 const git=args=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:2*1024*1024});git(['merge-base','--is-ancestor',packet.base_head,'HEAD']);
 const testRaw=physical(TEST_CONTINUATION.path);check(testRaw,TEST_CONTINUATION);const test=JSON.parse(testRaw);
 assert.equal(test.schema_version,1);assert.equal(test.role,'main-current-inventory-test-source-routing');assert.equal(test.base_head,'c2ae34b7664907b3add5951f357a922b9fed0d8e');assert.deepEqual(test.previous_packet,WRAPPER_CONTINUATION);
 assert.deepEqual(test.source_anchor,{packet:LATE_CONTINUATION,support_index:80});assert.deepEqual(test.support,[]);
 for(const[key,value]of Object.entries({source_scope_only:true,historical_programs_executed:false,historical_packets_rewritten:false,original_ledger_metadata_recipe_changed:false,source_judgments_changed:0,theme_module_contract_changed:false,css_or_artifact_admission_granted:false,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(test[key],value);
 assert.deepEqual(test.updates.map(row=>row.path),['tests/test_retained_landscape_tool_replay.py']);git(['merge-base','--is-ancestor',test.base_head,'HEAD']);
 const testUpdate=test.updates[0];assert.equal(testUpdate.before.path,testUpdate.path);assert.equal(testUpdate.after.path,testUpdate.path);
 const anchorRaw=physical(LATE_CONTINUATION.path);check(anchorRaw,LATE_CONTINUATION);assert.deepEqual(JSON.parse(anchorRaw).support[80],testUpdate.before);
 const testBefore=git(['show',test.base_head+':'+testUpdate.path]);check(testBefore,testUpdate.before);
 let testCursor=0;const testParts=[];assert.equal(testUpdate.edits.length,2);
 for(const edit of testUpdate.edits){assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=testCursor&&edit.offset<=testBefore.length);const old=Buffer.from(edit.before);assert.ok(testBefore.subarray(edit.offset,edit.offset+old.length).equals(old));testParts.push(testBefore.subarray(testCursor,edit.offset),Buffer.from(edit.after));testCursor=edit.offset+old.length;}
 const testAfter=Buffer.concat([...testParts,testBefore.subarray(testCursor)]);check(testAfter,testUpdate.after);
 const sassRaw=physical(SASS_CONTINUATION.path);check(sassRaw,SASS_CONTINUATION);const sass=JSON.parse(sassRaw);
 assert.equal(sass.schema_version,1);assert.equal(sass.role,'main-current-inventory-sass-source-routing');assert.equal(sass.base_head,'94f7fdf857ef3472001091e0e443cd64718f3810');assert.deepEqual(sass.previous_packet,TEST_CONTINUATION);assert.deepEqual(sass.support,[]);
 assert.deepEqual(sass.updates.map(row=>row.path),['scripts/current-sass-inspection-scope.mjs','tests/current_sass_c04_scope_probe.mjs','tests/current_sass_c04_fresh_probe.mjs','tests/test_current_sass_c04_scope.py','tests/sass_inspection_scope_probe.mjs','tests/test_sass_inspection_scope.py',testUpdate.path]);
 for(const[key,value]of Object.entries({source_scope_only:true,historical_programs_executed:false,historical_packets_rewritten:false,original_ledger_metadata_recipe_changed:false,source_judgments_changed:0,theme_module_contract_changed:false,css_or_artifact_admission_granted:false,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(sass[key],value);
 git(['merge-base','--is-ancestor',sass.base_head,'HEAD']);const latestTest=sass.updates.at(-1);assert.deepEqual(latestTest.before,testUpdate.after);assert.equal(latestTest.path,testUpdate.path);assert.equal(latestTest.after.path,testUpdate.path);
 assert.ok(git(['show',sass.base_head+':'+testUpdate.path]).equals(testAfter));let latestCursor=0;const latestParts=[];assert.equal(latestTest.edits.length,2);
 for(const edit of latestTest.edits){assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=latestCursor&&edit.offset<=testAfter.length);const old=Buffer.from(edit.before);assert.ok(testAfter.subarray(edit.offset,edit.offset+old.length).equals(old));latestParts.push(testAfter.subarray(latestCursor,edit.offset),Buffer.from(edit.after));latestCursor=edit.offset+old.length;}
 const testLatest=Buffer.concat([...latestParts,testAfter.subarray(latestCursor)]);check(testLatest,latestTest.after);assert.ok(testLatest.equals(physical(testUpdate.path)));
 // The old support remains Git comparison DATA. Current guards below bind the
 // actual afterimage, and no old wrapper bytes are supplied as current source.
 const supportComparison=ref=>{if(ref.path!==testUpdate.path)return physical(ref.path);assert.deepEqual(ref,testUpdate.before);assert.ok(physical(ref.path).equals(testLatest));return Buffer.from(testBefore);};
 const currentSupport=ref=>{if(ref.path!==testUpdate.path)return ref;assert.deepEqual(ref,testUpdate.before);return latestTest.after;};
 const rows=new Map();
 for(const row of packet.updates){
  assert.equal(row.before.path,row.path);assert.equal(row.after.path,row.path);const before=git(['show',packet.base_head+':'+row.path]);check(before,row.before);
  let cursor=0;const parts=[];assert.ok(Array.isArray(row.edits)&&row.edits.length>0);
  for(const edit of row.edits){assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor&&edit.offset<=before.length);assert.equal(typeof edit.before,'string');assert.equal(typeof edit.after,'string');assert.notEqual(edit.before,edit.after);const prior=Buffer.from(edit.before);assert.ok(before.subarray(edit.offset,edit.offset+prior.length).equals(prior));parts.push(before.subarray(cursor,edit.offset),Buffer.from(edit.after));cursor=edit.offset+prior.length;}
  parts.push(before.subarray(cursor));const current=Buffer.concat(parts);check(current,row.after);
  // The packed owner has further exact continuations below. Other routing
  // images must still match this untouched v2 afterimage directly.
  if(row.path!==paths[0])assert.ok(current.equals(physical(row.path)));
  rows.set(row.path,{before:{...row.before},after:{...row.after},images:new Map([[row.before.sha256,{ref:{...row.before},bytes:Buffer.from(before)}],[row.after.sha256,{ref:{...row.after},bytes:Buffer.from(current)}]])});
 }
 const nextRaw=physical(CONTINUATION.path);check(nextRaw,CONTINUATION);const next=JSON.parse(nextRaw);
 assert.equal(next.schema_version,1);assert.equal(next.role,'main-current-inventory-retained-source-routing');assert.equal(next.base_head,'b7ad00c881420e8621f23d77ab2feba7a3475e78');assert.equal(next.support_commit,next.base_head);assert.deepEqual(next.previous_packet,PACKET);
 for(const[key,value]of Object.entries({source_scope_only:true,historical_programs_executed:false,historical_packets_rewritten:false,original_ledger_metadata_recipe_changed:false,source_judgments_changed:0,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(next[key],value);
 assert.deepEqual(next.updates.map(row=>row.path),[paths[0]]);assert.equal(next.support.length,23);git(['merge-base','--is-ancestor',next.base_head,'HEAD']);
 for(const update of next.updates){
  const row=rows.get(update.path);assert.deepEqual(update.before,row.after);assert.equal(update.after.path,update.path);
  const before=git(['show',next.base_head+':'+update.path]);check(before,update.before);assert.ok(before.equals(row.images.get(update.before.sha256).bytes));
  let cursor=0;const parts=[];for(const edit of update.edits){assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor&&edit.offset<=before.length);const old=Buffer.from(edit.before);assert.ok(before.subarray(edit.offset,edit.offset+old.length).equals(old));parts.push(before.subarray(cursor,edit.offset),Buffer.from(edit.after));cursor=edit.offset+old.length;}
  parts.push(before.subarray(cursor));const after=Buffer.concat(parts);check(after,update.after);row.after={...update.after};row.images.set(update.after.sha256,{ref:{...update.after},bytes:Buffer.from(after)});
 }
 for(const ref of next.support){check(physical(ref.path),ref);const committed=git(['show',next.support_commit+':'+ref.path]);check(committed,ref);assert.ok(committed.equals(physical(ref.path)));}
 const lateRaw=physical(LATE_CONTINUATION.path);check(lateRaw,LATE_CONTINUATION);const late=JSON.parse(lateRaw);
 assert.equal(late.schema_version,1);assert.equal(late.role,'main-current-inventory-retained-source-routing');assert.equal(late.base_head,'9f794fdbe4ab6787a632193dec5c4650672bfec1');assert.equal(late.support_commit,late.base_head);assert.deepEqual(late.previous_packet,CONTINUATION);
 for(const[key,value]of Object.entries({source_scope_only:true,historical_programs_executed:false,historical_packets_rewritten:false,original_ledger_metadata_recipe_changed:false,source_judgments_changed:0,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(late[key],value);
 assert.deepEqual(late.updates.map(row=>row.path),[paths[0]]);assert.equal(late.support.length,84);git(['merge-base','--is-ancestor',late.base_head,'HEAD']);
 for(const update of late.updates){
  const row=rows.get(update.path);assert.deepEqual(update.before,row.after);assert.equal(update.after.path,update.path);
  const before=git(['show',late.base_head+':'+update.path]);check(before,update.before);assert.ok(before.equals(row.images.get(update.before.sha256).bytes));
  let cursor=0;const parts=[];for(const edit of update.edits){assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor&&edit.offset<=before.length);const old=Buffer.from(edit.before);assert.ok(before.subarray(edit.offset,edit.offset+old.length).equals(old));parts.push(before.subarray(cursor,edit.offset),Buffer.from(edit.after));cursor=edit.offset+old.length;}
  parts.push(before.subarray(cursor));const after=Buffer.concat(parts);check(after,update.after);row.after={...update.after};row.images.set(update.after.sha256,{ref:{...update.after},bytes:Buffer.from(after)});
 }
 for(const ref of late.support){const comparison=supportComparison(ref);check(comparison,ref);const committed=git(['show',late.support_commit+':'+ref.path]);check(committed,ref);assert.ok(committed.equals(comparison));}
 const identityRaw=physical(IDENTITY_CONTINUATION.path);check(identityRaw,IDENTITY_CONTINUATION);const identity=JSON.parse(identityRaw);
 assert.equal(identity.schema_version,1);assert.equal(identity.role,'main-current-inventory-retained-source-routing');assert.equal(identity.base_head,'97e568a761396b22efb63630b8c50a62fe2be8db');assert.equal(identity.support_commit,identity.base_head);assert.deepEqual(identity.previous_packet,LATE_CONTINUATION);
 for(const[key,value]of Object.entries({source_scope_only:true,historical_programs_executed:false,historical_packets_rewritten:false,original_ledger_metadata_recipe_changed:false,source_judgments_changed:0,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(identity[key],value);
 assert.deepEqual(identity.updates.map(row=>row.path),[paths[0]]);assert.equal(identity.support.length,3);git(['merge-base','--is-ancestor',identity.base_head,'HEAD']);
 for(const update of identity.updates){
  const row=rows.get(update.path);assert.deepEqual(update.before,row.after);assert.equal(update.after.path,update.path);
  const before=git(['show',identity.base_head+':'+update.path]);check(before,update.before);assert.ok(before.equals(row.images.get(update.before.sha256).bytes));
  let cursor=0;const parts=[];for(const edit of update.edits){assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor&&edit.offset<=before.length);const old=Buffer.from(edit.before);assert.ok(before.subarray(edit.offset,edit.offset+old.length).equals(old));parts.push(before.subarray(cursor,edit.offset),Buffer.from(edit.after));cursor=edit.offset+old.length;}
  parts.push(before.subarray(cursor));const after=Buffer.concat(parts);check(after,update.after);row.after={...update.after};row.images.set(update.after.sha256,{ref:{...update.after},bytes:Buffer.from(after)});
 }
 for(const ref of identity.support){check(physical(ref.path),ref);const committed=git(['show',identity.support_commit+':'+ref.path]);check(committed,ref);assert.ok(committed.equals(physical(ref.path)));}
 const wrapperRaw=physical(WRAPPER_CONTINUATION.path);check(wrapperRaw,WRAPPER_CONTINUATION);const wrapper=JSON.parse(wrapperRaw);
 assert.equal(wrapper.schema_version,1);assert.equal(wrapper.role,'main-current-inventory-retained-source-routing');assert.equal(wrapper.base_head,'646cc5ff7701db3455929a1af7325c928bd54cad');assert.equal(wrapper.support_commit,wrapper.base_head);assert.deepEqual(wrapper.previous_packet,IDENTITY_CONTINUATION);
 for(const[key,value]of Object.entries({source_scope_only:true,historical_programs_executed:false,historical_packets_rewritten:false,original_ledger_metadata_recipe_changed:false,source_judgments_changed:0,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(wrapper[key],value);
 assert.deepEqual(wrapper.updates.map(row=>row.path),[paths[0],...wrapperBefore.map(row=>row.path)]);assert.deepEqual(wrapper.support,[]);assert.deepEqual(wrapper.code_subject_anchors,wrapperAnchors);git(['merge-base','--is-ancestor',wrapper.base_head,'HEAD']);
 for(const [index,anchor]of wrapperAnchors.entries()){
  // Immutable Git DATA anchors the accepted old code identity. The live
  // reference packets are consumed separately by their owning stages.
  const raw=git(['show',wrapper.base_head+':'+anchor.packet.path]);check(raw,anchor.packet);assert.deepEqual(JSON.parse(raw).code_subject,wrapperBefore[index]);
 }
 for(const update of wrapper.updates){
  let row=rows.get(update.path);
  if(row)assert.deepEqual(update.before,row.after);
  else{assert.deepEqual(update.before,wrapperBefore.find(ref=>ref.path===update.path));row={before:{...update.before},after:{...update.before},images:new Map()};rows.set(update.path,row);}
  assert.equal(update.after.path,update.path);const before=git(['show',wrapper.base_head+':'+update.path]);check(before,update.before);
  if(row.images.has(update.before.sha256))assert.ok(before.equals(row.images.get(update.before.sha256).bytes));
  else row.images.set(update.before.sha256,{ref:{...update.before},bytes:Buffer.from(before)});
  let cursor=0;const parts=[];assert.ok(update.edits.length>0);
  for(const edit of update.edits){assert.deepEqual(Object.keys(edit).sort(),['after','before','offset']);assert.ok(Number.isSafeInteger(edit.offset)&&edit.offset>=cursor&&edit.offset<=before.length);const old=Buffer.from(edit.before);assert.ok(before.subarray(edit.offset,edit.offset+old.length).equals(old));parts.push(before.subarray(cursor,edit.offset),Buffer.from(edit.after));cursor=edit.offset+old.length;}
  parts.push(before.subarray(cursor));const after=Buffer.concat(parts);check(after,update.after);assert.ok(after.equals(physical(update.path)));row.after={...update.after};row.images.set(update.after.sha256,{ref:{...update.after},bytes:Buffer.from(after)});
 }
 assert.equal(rows.has(testUpdate.path),false);rows.set(testUpdate.path,{before:{...testUpdate.before},after:{...latestTest.after},images:new Map([[testUpdate.before.sha256,{ref:{...testUpdate.before},bytes:Buffer.from(testBefore)}],[testUpdate.after.sha256,{ref:{...testUpdate.after},bytes:Buffer.from(testAfter)}],[latestTest.after.sha256,{ref:{...latestTest.after},bytes:Buffer.from(testLatest)}]])});
 const unique=new Map();
 for(const ref of [{path:SELF,sha256:hash(image),bytes:image.length},{...PACKET},{...CONTINUATION},{...LATE_CONTINUATION},{...IDENTITY_CONTINUATION},{...WRAPPER_CONTINUATION},{...TEST_CONTINUATION},{...SASS_CONTINUATION},...[...rows.values()].map(row=>({...row.after})),...next.support,...late.support.map(currentSupport),...identity.support]){
  const prior=unique.get(ref.path);if(prior)assert.deepEqual(prior,ref);else unique.set(ref.path,{...ref});
 }
 const bound=[...unique.values()];
 let active=false,nested=false;
 const assertCurrent=()=>{if(active){nested=true;assert.fail('reentrant current inventory source');}active=true;nested=false;try{assert.ok(physical(SELF).equals(image));for(const ref of bound)check(physical(ref.path),ref);for(const ref of bound){const before=physical(ref.path),provided=read(ref.path);check(before,ref);assert.ok(Buffer.isBuffer(provided)&&before.equals(provided),'nonphysical current inventory source '+ref.path);assert.ok(before.equals(physical(ref.path)));}assert.equal(nested,false,'caught current inventory source reentry');for(const ref of bound)check(physical(ref.path),ref);}finally{active=false;}};
 const select=ref=>{
  assert.ok(ref&&typeof ref==='object'&&!types.isProxy(ref)&&Object.getPrototypeOf(ref)===Object.prototype);const fields=Object.getOwnPropertyDescriptors(ref),keys=Reflect.ownKeys(fields);assert.ok(keys.every(key=>typeof key==='string'));assert.deepEqual(keys.sort(),Object.hasOwn(fields,'bytes')?['bytes','path','sha256']:['path','sha256']);for(const field of Object.values(fields))assert.ok(Object.hasOwn(field,'value')&&field.enumerable);
  const row=rows.get(fields.path.value);if(!row)return null;const prior=row.images.get(fields.sha256.value);assert.ok(prior,'unknown inventory routing source identity');if(fields.bytes)assert.equal(fields.bytes.value,prior.ref.bytes);assertCurrent();assert.equal(Object.getPrototypeOf(ref),Object.prototype);assert.deepEqual(Object.getOwnPropertyDescriptors(ref),fields,'inventory source reference changed during callbacks');return {row,prior,hasBytes:Object.hasOwn(fields,'bytes')};
 };
 const qualify=ref=>{const selected=select(ref);if(!selected)return null;return {path:selected.row.after.path,sha256:selected.row.after.sha256,...(selected.hasBytes?{bytes:selected.row.after.bytes}:{})};};
 const comparisonBytes=ref=>{const selected=select(ref);assert.ok(selected,'unknown inventory routing comparison path');return Buffer.from(selected.prior.bytes);};
 assertCurrent();return {bound:structuredClone(bound),transitions:[...rows.values()].map(({before,after})=>({path:before.path,before:{...before},after:{...after}})),qualify,comparisonBytes,assertCurrent,historical_programs_executed:false,current_read_route_returned:false,g11_claim:'not-passed'};
}
