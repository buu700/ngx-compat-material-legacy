/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Pure expected-only composition. The caller authenticates the entire prior
 * aggregate, its source, compiler, program and producer before calling this. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {SPINNER_SNACK_AGGREGATE_CASES} from './sass-spinner-snack-aggregate-contract.mjs';
import {ordinaryCheckboxButtonExpectedCss} from '../compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs';

export const ORDINARY_AGGREGATE_CASES=Object.freeze([...SPINNER_SNACK_AGGREGATE_CASES]);
const hash=css=>createHash('sha256').update(css).digest('hex');
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function fields(value,keys){
 assert.ok(value&&typeof value==='object'&&!types.isProxy(value));assert.equal(Object.getPrototypeOf(value),Object.prototype);
 const descriptors=Object.getOwnPropertyDescriptors(value),out={};
 for(const key of keys){const d=descriptors[key];assert.ok(d&&Object.hasOwn(d,'value')&&d.enumerable);out[key]=d.value;}
 return out;
}
function componentCase(caseId,family){
 const [kind,mixin,variant]=caseId.split('/');
 const dimension=mixin==='all-component-colors'?'color':mixin==='all-component-themes'?'theme':'typography';
 return kind+'/'+family+'-'+dimension+(variant?'/'+variant:'');
}
function fragments(css,scope){
 // Only flat root-scope rules participate. Nested datepicker/legacy rules and
 // every other component remain in the untouched surrounding substrings.
 const pattern=new RegExp('^('+escape(scope)+'[^{}]*) \\{\\n([^{}]*)\\n\\}','gm');
 const rules=[...css.matchAll(pattern)].map(match=>({start:match.index,end:match.index+match[0].length,header:match[1],body:match[2]}));
 function familyRules(family){
  const selector=family==='checkbox'?
   new RegExp('^'+escape(scope)+' \\.mat-mdc-checkbox(?:-touch-target)?(?=[.#:\\[\\s]|$)'):
   new RegExp('^'+escape(scope)+' \\.(?:mat-mdc-(?:button|unelevated-button|raised-button|outlined-button)|mdc-button)(?=[.#:\\[\\s]|$)');
  const rootToken=family==='checkbox'?/(?:^|\n)  --(?:mdc-checkbox-|mat-checkbox-)/:/(?:^|\n)  --mat-button-(?:text|filled|protected|outlined)-/;
  const selected=rules.map((rule,index)=>({rule,index})).filter(({rule})=>
   rule.header.split(/,\s*/).some(value=>selector.test(value))||(rule.header===scope&&rootToken.test(rule.body)));
  assert.ok(selected.length>0,'missing ordinary root fragment');
  for(let i=0;i<selected.length;i++)assert.equal(selected[i].index,selected[0].index+i,'ordinary root fragment is not contiguous');
  const start=selected[0].rule.start,end=selected.at(-1).rule.end,original=css.slice(start,end);
  assert.equal(css.split(original).length,2,'duplicate ordinary root fragment');
  return {family,start,end,original};
 }
 const checkbox=familyRules('checkbox'),button=familyRules('button');
 assert.ok(checkbox.end<button.start,'ordinary family order changed');
 assert.equal(css.slice(checkbox.end,button.start),'\n','unexpected content between ordinary root families');
 return [checkbox,button];
}

/** Compose after spinner/snack's existing expected-model insertion. Candidate
 * CSS must never be supplied as css. Unknown or malformed prior models reject. */
export function insertOrdinaryCheckboxButtonIntoAggregateModel(args){
 try{
  const {caseId,css}=fields(args,['caseId','css']);assert.ok(ORDINARY_AGGREGATE_CASES.includes(caseId));
  assert.equal(typeof css,'string');assert.ok(css.length>0&&!css.includes('\r'));
  const scope=caseId.startsWith('mixin-css/')?'.sass-api-probe':'.sass-argument-probe';
  const edits=fragments(css,scope).map(fragment=>{
   const expected=ordinaryCheckboxButtonExpectedCss({caseId:componentCase(caseId,fragment.family),originalCss:fragment.original});
   assert.notEqual(expected,null,'unmodeled ordinary root fragment');return {...fragment,expected};
  });
  let expected=css;
  for(const edit of edits.sort((a,b)=>b.start-a.start))expected=expected.slice(0,edit.start)+edit.expected+expected.slice(edit.end);
  return expected;
 }catch{return null;}
}
export const ordinaryAggregateExpectedCss=insertOrdinaryCheckboxButtonIntoAggregateModel;

/** Whole candidate bytes are compared, never normalized or rewritten. */
export function ordinaryAggregateResultsMatch(args){
 try{
  const {caseId,original,actual}=fields(args,['caseId','original','actual']);
  const values=[original,actual].map(value=>fields(value,['css','css_sha256','css_bytes']));
  for(const value of values)assert.ok(typeof value.css==='string'&&value.css_sha256===hash(value.css)&&Number.isSafeInteger(value.css_bytes)&&value.css_bytes===Buffer.byteLength(value.css));
  const expected=insertOrdinaryCheckboxButtonIntoAggregateModel({caseId,css:values[0].css});
  return expected!==null&&values[1].css===expected;
 }catch{return false;}
}
