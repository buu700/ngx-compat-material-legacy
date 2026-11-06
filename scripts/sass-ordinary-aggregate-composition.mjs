/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite expected-only composition; callers authenticate the original program,
 * historical CSS, peer measurements and candidate source before admission. */
import assert from 'node:assert/strict';
import {types} from 'node:util';
import {ordinaryCheckboxButtonExpectedCss} from '../compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs';
const IDS=new Set(['mixin-css/all-component-densities','mixin-argument/all-component-densities/custom-full-theme','mixin-argument/all-component-densities/raw-density-config']);
function fields(args){
 assert.ok(args&&typeof args==='object'&&!types.isProxy(args)&&Object.getPrototypeOf(args)===Object.prototype);
 const ds=Object.getOwnPropertyDescriptors(args);assert.deepEqual(Reflect.ownKeys(ds).sort(),['caseId','css']);
 for(const d of Object.values(ds))assert.ok(Object.hasOwn(d,'value')&&d.enumerable);
 assert.equal(typeof ds.caseId.value,'string');assert.equal(typeof ds.css.value,'string');assert.ok(ds.css.value&&!ds.css.value.includes('\r'));
 return {caseId:ds.caseId.value,css:ds.css.value};
}
function rules(css){
 const out=[];for(const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
  const leading=/^\s*/.exec(m[1])[0],header=m[1].slice(leading.length);assert.ok(header.endsWith(' '));
  out.push({start:m.index+leading.length,end:m.index+m[0].length,header:header.slice(0,-1),body:m[2]});
 }return out;
}
function unique(rows,predicate){const found=rows.map((r,i)=>predicate(r)?i:-1).filter(i=>i>=0);assert.equal(found.length,1);return found[0];}
function replace(css,edits){for(const e of edits.sort((a,b)=>b.start-a.start))css=css.slice(0,e.start)+e.value+css.slice(e.end);return css;}
/** Only the three enumerated all-component density contexts. */
export function composeOrdinaryAggregateDensity(args){try{
 const {caseId,css}=fields(args);assert.ok(IDS.has(caseId));const arg=caseId.startsWith('mixin-argument/'),scope=arg?'.sass-argument-probe':'.sass-api-probe',rs=rules(css),edits=[];
 const ck=unique(rs,r=>r.header===scope&&/^\n  --mdc-checkbox-state-layer-size: [^;\n]+;\n$/.test(r.body));
 const next=rs[ck+1]?.header===scope+' .mat-mdc-checkbox-touch-target';
 const bt=unique(rs,r=>r.header.startsWith(scope+' .mat-mdc-button.mat-mdc-button-base,\n')&&r.header.endsWith(scope+' .mat-mdc-outlined-button.mat-mdc-button-base'));
 const reset=rs[bt+1]?.header.includes('.mdc-button__touch'),touch=rs[bt+1+(reset?1:0)]?.header.includes('.mat-mdc-button-touch-target');
 const ends=[next?ck+1:ck,bt+(reset?1:0)+(touch?1:0)];assert.ok(ck<bt);
 for(const [first,last,family] of [[ck,ends[0],'checkbox'],[bt,ends[1],'button']]){
  const start=rs[first].start,end=rs[last].end,fragment=css.slice(start,end);assert.equal(css.split(fragment).length,2);
  const child=(arg?'mixin-argument/':'mixin-css/')+family+'-density'+(arg?'/custom-full-theme':'');
  const value=ordinaryCheckboxButtonExpectedCss({caseId:child,originalCss:fragment});assert.equal(typeof value,'string');edits.push({start,end,value});
 }return replace(css,edits);
 }catch{return null}}
