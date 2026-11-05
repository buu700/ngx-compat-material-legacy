/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Pure finite source-proposal CSS model; no current source/artifact admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {types} from 'node:util';
import {ordinaryCardPublicBridgeCss} from './ordinary-card-public-bridge-model-v1.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const raw=readFileSync(new URL('./ordinary-card-public-bridge-original-cases-v1.json',import.meta.url));
assert.equal(hash(raw),'59e47c924f0f541b7b262a9ee31f6e55bc4160c1c420f683247a1703be470bbf');
assert.equal(hash(readFileSync(new URL('./ordinary-card-public-bridge-model-v1.mjs',import.meta.url))),'0286969a007029a3628d8a56fb17c0ee2bbfecec735abdf5d95911ac7c709a83');
const packet=JSON.parse(raw),cases=new Map(packet.cases.map(row=>[row.case_id,row]));assert.equal(cases.size,16);
export const ORDINARY_CARD_V2_CASES=Object.freeze([...cases.keys()]);
function plain(value){
 if(value===null||['string','boolean'].includes(typeof value))return value;
 if(typeof value==='number'){assert.ok(Number.isSafeInteger(value));return value;}
 assert.ok(value&&typeof value==='object'&&!types.isProxy(value));const array=Array.isArray(value);assert.equal(Object.getPrototypeOf(value),array?Array.prototype:Object.prototype);
 const descriptors=Object.getOwnPropertyDescriptors(value),out=array?[]:{};
 for(const key of Reflect.ownKeys(descriptors)){assert.equal(typeof key,'string');if(array&&key==='length')continue;const d=descriptors[key];assert.ok(Object.hasOwn(d,'value')&&d.enumerable);if(array)assert.match(key,/^(?:0|[1-9][0-9]*)$/);Object.defineProperty(out,key,{value:plain(d.value),enumerable:true,writable:true,configurable:true});}
 if(array){assert.equal(out.length,descriptors.length.value);assert.equal(Object.keys(out).length,out.length);}return out;
}
/** Values come from tagged16 owned untamable maps, not candidate emissions. */
export function ordinaryCardPublicBridgeV2Css(args){
 const {caseId,originalCss}=plain(args),row=cases.get(caseId);assert.ok(row,'unknown finite card v2 case');
 const color=ordinaryCardPublicBridgeCss({caseId,originalCss});
 if(row.dimension!=='theme')return color;
 const base=row.selector+' {\n  --mat-card-elevated-container-shape: 4px;\n  --mat-card-outlined-container-shape: 4px;\n  --mat-card-outlined-outline-width: 1px;\n}';
 return base+'\n'+color;
}
export function ordinaryCardPublicBridgeV2ResultsMatch(args){
 try{const {caseId,original,actual}=plain(args);const expected=ordinaryCardPublicBridgeV2Css({caseId,originalCss:original.css});
  return original.css_sha256===hash(original.css)&&original.css_bytes===Buffer.byteLength(original.css)&&actual.css===expected&&actual.css_sha256===hash(expected)&&actual.css_bytes===Buffer.byteLength(expected);
 }catch{return false;}
}
export function ordinaryCardPublicBridgeV2BatchCss(originalBatch){
 assert.equal(typeof originalBatch,'string');assert.equal(originalBatch,packet.raw_original_batch.css);
 assert.equal(hash(originalBatch),packet.raw_original_batch.sha256);assert.equal(Buffer.byteLength(originalBatch),packet.raw_original_batch.bytes);
 let output=originalBatch;
 for(let index=packet.cases.length-1;index>=0;index--){
  const row=packet.cases[index],begin='/*! ORDINARY-CARD-BEGIN '+index+' */',end='/*! ORDINARY-CARD-END '+index+' */';
  assert.equal(originalBatch.split(begin).length,2);assert.equal(originalBatch.split(end).length,2);
  const start=originalBatch.indexOf(begin)+begin.length,finish=originalBatch.indexOf(end),segment=originalBatch.slice(start,finish);assert.equal(segment,row.raw_segment);
  const css=ordinaryCardPublicBridgeV2Css({caseId:row.case_id,originalCss:row.original.css});
  const next=css?packet.framing.leading+css+packet.framing.trailing:segment;
  output=output.slice(0,start)+next+output.slice(finish);
 }
 return output;
}
