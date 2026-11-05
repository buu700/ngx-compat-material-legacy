/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current physical canonical inputs; callbacks never own the final sweep. */
import assert from 'node:assert/strict';
import {types} from 'node:util';
import {readHistoricalContractRepairOwnerMember} from './historical-contract-repair-readers.mjs';
import {captureCurrentSassMetadata} from './current-sass-inspection-scope.mjs';
const equals=Buffer.prototype.equals;
const equal=(a,b)=>Buffer.isBuffer(b)&&Reflect.apply(equals,a,[b]);
export function canonicalSourcePhysicalBoundary({root,read:suppliedRead,absentPaths=[]}){
 assert.equal(typeof suppliedRead,'function');const retained=new Map();
 absentPaths=captureCurrentSassMetadata(absentPaths);assert.ok(Array.isArray(absentPaths));assert.equal(new Set(absentPaths).size,absentPaths.length);
 for(const path of absentPaths)assert.match(path,/^projects\/ngx-material-legacy\/styles\/(?!.*(?:^|\/)\.\.?(?:\/|$))[^\\\0]+\.scss$/);
 const read=path=>{
  const actual=readHistoricalContractRepairOwnerMember(root,path),before=retained.get(path);
  if(before)assert.ok(equal(actual,before),'changed retained canonical input '+path);else retained.set(path,Buffer.from(actual));
  assert.ok(equal(actual,suppliedRead(path)),'nonphysical canonical input '+path);
  assert.ok(equal(readHistoricalContractRepairOwnerMember(root,path),actual),'canonical input changed during callback '+path);
  return actual;
 };
 const assertPhysical=()=>{
  for(const[path,before]of retained)assert.ok(equal(readHistoricalContractRepairOwnerMember(root,path),before),'changed final canonical input '+path);
  for(const path of absentPaths){let absent=false;try{readHistoricalContractRepairOwnerMember(root,path);}catch(error){assert.equal(error.code,'ENOENT','unreadable canonical counterpart is not absent');absent=true;}assert.equal(absent,true,'new canonical owned counterpart '+path);}
 };
 return {read,assertPhysical};
}
/** Preserve argument identities/descriptors as well as nested JSON metadata. */
export function captureCanonicalSourceArguments(args){
 assert.ok(args&&typeof args==='object'&&!types.isProxy(args));assert.equal(Object.getPrototypeOf(args),Object.prototype);
 const allowed=['family','entries','body','root','read'],descriptors=Object.getOwnPropertyDescriptors(args),values={};
 for(const key of Reflect.ownKeys(descriptors)){
  assert.equal(typeof key,'string');assert.ok(allowed.includes(key));const d=descriptors[key];assert.ok(Object.hasOwn(d,'value')&&d.enumerable);
  Object.defineProperty(values,key,{value:d.value,enumerable:true});
 }
 const metadata=()=>captureCurrentSassMetadata(Object.fromEntries(Object.keys(values).filter(key=>key!=='read'&&values[key]!==undefined).map(key=>[key,args[key]])));
 const before=metadata();
 const assertCurrent=()=>{
  assert.equal(Object.getPrototypeOf(args),Object.prototype);const now=Object.getOwnPropertyDescriptors(args);
  assert.deepEqual(Reflect.ownKeys(now),Reflect.ownKeys(descriptors));
  for(const key of Reflect.ownKeys(descriptors)){
   assert.ok(Object.hasOwn(now[key],'value'));assert.equal(now[key].value,descriptors[key].value);
   for(const flag of ['enumerable','writable','configurable'])assert.equal(now[key][flag],descriptors[key][flag]);
  }
  assert.deepEqual(metadata(),before,'canonical source arguments changed during callbacks');
 };
 // Judgments use an isolated snapshot; a callback cannot temporarily alter a
 // bound reference then restore the original arguments before the last guard.
 const judgments=Object.fromEntries(Object.keys(values).map(key=>[key,key==='read'?values[key]:before[key]]));
 return {values:judgments,assertCurrent};
}
