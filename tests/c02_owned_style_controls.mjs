/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {OWNED_STYLE_PROBES as P,assessOwnedStyles,assessSnackLifecycle} from '../scripts/owned-style-contract.mjs';
const ref=Object.fromEntries(Object.entries(P).map(([id,p])=>[id,{found:true,values:Object.fromEntries(p.properties.map(k=>[k,k==='visibility'?'visible':['opacity','effective-opacity'].includes(k)?'1':k==='state-active'?'true':k.startsWith('rect-')?'40':['theme-light','theme-dark'].includes(p.context)?'rgb(44, 55, 66)':'rgb(11, 22, 33)']))}]));
const neg=structuredClone(ref);for(const [id,p] of Object.entries(P)){let k=p.properties.includes('line-height')?'line-height':p.properties[0];neg[id].values[k]='wrong';}
assert.equal(Object.keys(P).length,57);assert.ok(Object.values(assessOwnedStyles(ref,ref,neg)).every(x=>x.result==='pass'));
for(const id of Object.keys(P)){let b=structuredClone(ref);b[id].found=false;assert.equal(assessOwnedStyles(ref,b,neg)[id].result,'fail');let n=structuredClone(neg);n[id]=structuredClone(ref[id]);assert.equal(assessOwnedStyles(ref,ref,n)[id].result,'fail');}
for(const id of Object.keys(P).filter(x=>x.includes('visible-disabled-placeholder'))){for(const [k,v] of [['visibility','hidden'],['opacity','0'],['effective-opacity','0']]){let b=structuredClone(ref);b[id].values[k]=v;assert.equal(assessOwnedStyles(ref,b,neg)[id].result,'fail');}}
for(const id of Object.keys(P).filter(x=>x.includes('snack-focused-action')||x.includes('snack-disabled-action'))){let b=structuredClone(ref);b[id].values['state-active']='false';assert.equal(assessOwnedStyles(ref,b,neg)[id].result,'fail');}
let flat=structuredClone(ref);flat['theme-dark/visible-disabled-placeholder']=structuredClone(ref['light/visible-disabled-placeholder']);for(const [id,p] of Object.entries(P))if(p.context==='theme-dark'&&!id.split('/')[1].startsWith('snack-'))assert.equal(assessOwnedStyles(flat,flat,neg)[id].result,'fail',id);
const life={first_events:['action','dismissed:true'],first_removed:true,reopened:true,second_events:['dismissed:false'],second_removed:true,negative_events:['dismissed:false'],negative_removed:true};assert.ok(assessSnackLifecycle(life));for(const k of Object.keys(life)){let bad=structuredClone(life);bad[k]=Array.isArray(bad[k])?bad[k].toReversed():false; if(k==='second_events'||k==='negative_events')bad[k]=['action','dismissed:false'];assert.equal(assessSnackLifecycle(bad),false,k);}
console.log('PASS: 57 cases; missing, inert mutation, visibility, opacity, focus/disabled, inert dark theme and lifecycle controls');
