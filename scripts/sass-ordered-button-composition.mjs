/** @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {types} from 'node:util';
import {ordinaryCheckboxButtonExpectedCss} from '../compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs';
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
function mapHeaders(css,from,to){let cursor=0,out='';for(const r of rules(css)){
 assert.ok(r.header.split(/,\n|, /).every(s=>s===from||s.startsWith(from+' ')));
 out+=css.slice(cursor,r.start)+r.header.replaceAll(from,to)+css.slice(r.start+r.header.length,r.end);cursor=r.end;
 }return out+css.slice(cursor)}
/** The one authenticated ordered fixture; root light then nested dark only. */
export function composeOrderedAggregateButton(args){try{
 const {caseId,css}=fields(args);assert.equal(caseId,'06-aggregate-and-companions');const rs=rules(css),edits=[];
 for(const [nested,phases] of [['.mat-datepicker-content',['color','density','typography']],['.dark-shell .mat-datepicker-content',['color','density']]]){
  const classes=['mat-mdc-button','mat-mdc-unelevated-button','mat-mdc-raised-button','mat-mdc-outlined-button'];
  const belongs=r=>r.header.split(/,\n|, /).every(s=>s===nested+' .mdc-button'||classes.some(c=>s.startsWith(nested+' .'+c)&&/^(?:[.:[\s]|$)/.test(s.slice((nested+' .'+c).length))));
  const groups=[];for(let i=0;i<rs.length;i++)if(belongs(rs[i])){const group=[rs[i]];while(i+1<rs.length&&belongs(rs[i+1]))group.push(rs[++i]);groups.push(group)}assert.equal(groups.length,phases.length);
  groups.forEach((g,i)=>{const start=g[0].start,end=g.at(-1).end,fragment=css.slice(start,end);assert.equal(css.split(fragment).length,2);
   const child=ordinaryCheckboxButtonExpectedCss({caseId:'mixin-css/button-'+phases[i],originalCss:mapHeaders(fragment,nested,'.sass-api-probe')});assert.equal(typeof child,'string');
   let value=mapHeaders(child,'.sass-api-probe',nested);if(nested==='.mat-datepicker-content'&&phases[i]==='typography'){assert.ok(css.slice(end).startsWith('\n.mat-option {'));value+='\n'}edits.push({start,end,value});});
 }
 assert.equal(edits.length,5);assert.ok(edits.every((v,i)=>!i||edits[i-1].end<v.start));return replace(css,edits);
 }catch{return null}}
