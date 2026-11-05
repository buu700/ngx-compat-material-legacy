/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Pure fifth-module composition after the authenticated four-module model. */
import assert from 'node:assert/strict';
import {types} from 'node:util';
import {SPINNER_SNACK_AGGREGATE_CASES} from './sass-spinner-snack-aggregate-contract.mjs';
import {positionedOrdinaryCardCss} from '../compatibility/rc/ordinary-card-public-bridge-model-v1.mjs';
export const CARD_AGGREGATE_CASES=Object.freeze([...SPINNER_SNACK_AGGREGATE_CASES]);
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
/** Candidate CSS never enters this expected-only function. The caller owns the
 * complete prior CSS, sources, compiler, program and producer authentication. */
export function insertCardIntoAggregateModel(args){
 try{
  assert.ok(args&&typeof args==='object'&&!types.isProxy(args));assert.equal(Object.getPrototypeOf(args),Object.prototype);
  const ds=Object.getOwnPropertyDescriptors(args);assert.deepEqual(Reflect.ownKeys(ds).sort(),['caseId','css']);
  for(const d of Object.values(ds))assert.ok(Object.hasOwn(d,'value')&&d.enumerable);
  const caseId=ds.caseId.value,css=ds.css.value;assert.ok(CARD_AGGREGATE_CASES.includes(caseId));assert.equal(typeof css,'string');assert.ok(css&&!css.includes('\r'));
  const scope=caseId.startsWith('mixin-css/')?'.sass-api-probe':'.sass-argument-probe',selector=scope+' .mat-mdc-card';
  const dimension=caseId.includes('all-component-typographies')?'typography':caseId.includes('all-component-themes')?'theme':'color';
  const matches=[...css.matchAll(new RegExp('^'+escape(selector)+'(?=[.#:\\[\\s]|$)[^{}]* \\{\\n[^{}]*\\n\\}','gm'))];
  assert.equal(matches.length,dimension==='theme'?2:1,'unexpected root card rules');
  // Every owned selector occurrence must be an exact modeled block header.
  // Extra compact, split-header or nested rules cannot hide in outer bytes.
  const owned=[...css.matchAll(new RegExp(escape(selector)+'(?=[.#:\\[\\s,{]|$)','g'))];
  assert.deepEqual(owned.map(m=>m.index),matches.map(m=>m.index),'unmodeled owned card selector');
  const original=matches.map(m=>m[0]).join('\n');assert.equal(css.split(original).length,2,'card rules must be contiguous and unique');
  const positioned=positionedOrdinaryCardCss({dimension,selector,originalCss:original});
  if(dimension==='typography'){assert.equal(positioned,original);return css;}
  // Both aggregate colors and themes invoke card.theme, including base tokens.
  const base=selector+' {\n  --mat-card-elevated-container-shape: 4px;\n  --mat-card-outlined-container-shape: 4px;\n  --mat-card-outlined-outline-width: 1px;\n}';
  const start=matches[0].index;return css.slice(0,start)+base+'\n'+positioned+css.slice(start+original.length);
 }catch{return null;}
}
