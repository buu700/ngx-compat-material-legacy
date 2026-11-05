/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Pure finite nested composition. Authenticate complete original CSS/program/
 * producer/source independently; this helper grants no source/artifact admission. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {ordinaryCheckboxButtonExpectedCss} from './ordinary-checkbox-button-expectation-model-v1.mjs';
const packetRaw=readFileSync(new URL('./ordinary-checkbox-button-legacy-composition-cases-v1.json',import.meta.url));
assert.equal(createHash('sha256').update(packetRaw).digest('hex'),'8f4186d34848a0f298170c2124bbb727ff31a3995a1e8f041ab05476ffe1125d');
const packet=JSON.parse(packetRaw);
export const LEGACY_DATEPICKER_BUTTON_CASES=Object.freeze(packet.cases.map(r=>r.case_id));
const plans=new Map(packet.cases.map(r=>[r.case_id,r]));
assert.equal(createHash('sha256').update(readFileSync(new URL('./ordinary-checkbox-button-expectation-model-v1.mjs',import.meta.url))).digest('hex'),'f094e84d2ce8a3f36aab239eb0d30940da976072a85ca0edcf29b8afb6dc9fb0');
const knownRaw=readFileSync(new URL('./ordinary-checkbox-button-legacy-composition-known-before-v1.json',import.meta.url));
assert.equal(createHash('sha256').update(knownRaw).digest('hex'),'3e96bf8c73dc35d1cb9d132c74f69b6f91ee7d22b19b185cf3540d68d3cb9f43');
const known=new Map(JSON.parse(knownRaw).cases.map(r=>[r.case_id,r]));

const hash=v=>createHash('sha256').update(v).digest('hex');
function capture(args,keys){assert.ok(args&&typeof args==='object'&&!types.isProxy(args));assert.equal(Object.getPrototypeOf(args),Object.prototype);const ds=Object.getOwnPropertyDescriptors(args),out={};for(const k of keys){const d=ds[k];assert.ok(d&&Object.hasOwn(d,'value')&&d.enumerable);out[k]=d.value;}return out;}
function leafRules(css){
 const out=[];for(const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
  const leading=/^\s*/.exec(m[1])[0],header=m[1].slice(leading.length);if(!header.endsWith(' '))continue;
  out.push({start:m.index+leading.length,end:m.index+m[0].length,header:header.slice(0,-1),body:m[2]});
 }return out;
}
function mapHeaders(css,from,to){
 let cursor=0,out='';for(const r of leafRules(css)){
  const pieces=r.header.split(/,\n|, /);assert.ok(pieces.every(s=>s===from||s.startsWith(from+' ')));
  const next=r.header.replaceAll(from,to);out+=css.slice(cursor,r.start)+next+css.slice(r.start+r.header.length,r.end);cursor=r.end;
 }return out+css.slice(cursor);
}
function transform(caseId,originalCss){
 assert.equal(typeof originalCss,'string');const plan=plans.get(caseId);assert.ok(plan);
 const scope=caseId.startsWith('mixin-css/')?'.sass-api-probe':'.sass-argument-probe',nested=scope+' .mat-datepicker-content';
 const all=leafRules(originalCss),selected=[];
 // Only these exact ordinary selectors can form the source-owned segment.
 const classes=['mat-mdc-button','mat-mdc-unelevated-button','mat-mdc-raised-button','mat-mdc-outlined-button'];
 const belongs=r=>r.header.split(/,\n|, /).every(selector=>selector===nested+' .mdc-button'||classes.some(cls=>selector.startsWith(nested+' .'+cls)&&/^(?:[.:[\s]|$)/.test(selector.slice((nested+' .'+cls).length))));
 for(let i=0;i<all.length;i++)if(belongs(all[i])){
  const group=[all[i]];while(i+1<all.length&&belongs(all[i+1]))group.push(all[++i]);
  selected.push(group);
 }
 assert.equal(selected.length,plan.phases.length,'inherited ordinary segment count changed');
 const replacements=[];
 for(const[group,dimension]of selected.map((g,i)=>[g,plan.phases[i]])){
  const start=group[0].start,end=group.at(-1).end,before=originalCss.slice(start,end);
  const rootBefore=mapHeaders(before,nested,scope),rootId=(scope==='.sass-api-probe'?'mixin-css/':'mixin-argument/')+'button-'+dimension+(scope==='.sass-api-probe'?'':'/custom-full-theme');
  const rootExpected=ordinaryCheckboxButtonExpectedCss({caseId:rootId,originalCss:rootBefore});assert.equal(typeof rootExpected,'string','nested before does not match exact owned ordinary skeleton');
  const expected=mapHeaders(rootExpected,scope,nested);replacements.push({start,end,expected,dimension});
 }
 let result=originalCss;for(const r of replacements.toReversed())result=result.slice(0,r.start)+r.expected+result.slice(r.end);
 return result;
}
export function legacyDatepickerButtonExpectedCss(args){
 try{const{caseId,originalCss}=capture(args,['caseId','originalCss']);return transform(caseId,originalCss);}catch{return null;}
}
export function legacyDatepickerButtonResultsMatch(args){
 try{const{caseId,original,actual}=capture(args,['caseId','original','actual']),o=capture(original,['css','css_sha256','css_bytes']),a=capture(actual,['css','css_sha256','css_bytes']);
 for(const m of[o,a])assert.ok(typeof m.css==='string'&&m.css_sha256===hash(m.css)&&Number.isSafeInteger(m.css_bytes)&&m.css_bytes===Buffer.byteLength(m.css));
 const expected=transform(caseId,o.css);return a.css===expected;}catch{return false;}
}

/** Exact measured source-view originals only; remaining finite plans stay unqualified.
 * This identity check is not an untouched16/artifact/run admission. */
export function legacyDatepickerButtonKnownExpectedCss(args){
 try{const{caseId,original}=capture(args,['caseId','original']),o=capture(original,['css','css_sha256','css_bytes','program_sha256']),pin=known.get(caseId);assert.ok(pin,'no independently measured before image');
 assert.equal(hash(o.css),o.css_sha256);for(const key of ['css_sha256','css_bytes','program_sha256'])assert.equal(o[key],pin[key]);assert.equal(Buffer.byteLength(o.css),pin.css_bytes);
 return transform(caseId,o.css);}catch{return null;}
}
