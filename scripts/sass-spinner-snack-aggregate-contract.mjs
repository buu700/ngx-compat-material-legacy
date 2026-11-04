/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite composition only. Callers authenticate the complete prior CSS model. */
import assert from 'node:assert/strict';
import {spinnerSnackPositionedTokenCss} from './sass-spinner-snack-bridge-contract.mjs';

export const SPINNER_SNACK_AGGREGATE_CASES=Object.freeze([
 'mixin-css/all-component-colors','mixin-css/all-component-themes','mixin-css/all-component-typographies',
 ...['all-component-colors/custom-full-theme','all-component-colors/raw-color-config',
 'all-component-themes/custom-full-theme','all-component-themes/custom-dark-theme',
 'all-component-typographies/custom-full-theme','all-component-typographies/raw-typography-config'].map(id=>'mixin-argument/'+id),
]);

/** Insert into independently authenticated expected CSS, never into candidate CSS. */
export function insertSpinnerSnackIntoAggregateModel({caseId,css}={}){
 try{
  assert.ok(SPINNER_SNACK_AGGREGATE_CASES.includes(caseId));assert.equal(typeof css,'string');
  const scope=caseId.startsWith('mixin-css/')?'.sass-api-probe':'.sass-argument-probe';
  const dimension=caseId.includes('all-component-colors')?'color':caseId.includes('all-component-themes')?'theme':'typography';
  const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const token=/--mat-(?:progress-spinner-active-indicator-color|snack-bar-(?:container-color|supporting-text-(?:color|font|line-height|size|weight)))\s*:/;
  assert.equal(token.test(css),false,'prior aggregate already has positioned bridge tokens');
  let result=css;
  function replaceFamily(family,kind,count){
   const selector=escape(scope+' .mat-mdc-'+(family==='progress-spinner'?'progress-spinner':'snack-bar-container'));
   const pattern=new RegExp('^'+selector+(family==='progress-spinner'?'(?:\\.mat-(?:accent|warn))?':'')+' \\{\\n[^{}]*\\n\\}','gm');
   const blocks=[...result.matchAll(pattern)].map(match=>match[0]);assert.equal(blocks.length,count,'unexpected aggregate family population');
   const original=blocks.join('\n');assert.equal(result.split(original).length,2,'aggregate rules must remain contiguous and unique');
   const expected=spinnerSnackPositionedTokenCss({family,dimension:kind,originalCss:original});assert.notEqual(expected,null);
   result=result.replace(original,expected);
  }
  if(dimension!=='typography')replaceFamily('progress-spinner','color',3);
  replaceFamily('snack-bar',dimension,dimension==='theme'?2:1);
  return result;
 }catch{return null;}
}
