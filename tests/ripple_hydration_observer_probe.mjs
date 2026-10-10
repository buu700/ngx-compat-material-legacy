/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {observeHydrationReplay} from '../scripts/ripple-hydration-replay.mjs';
import {rippleHydrationReplayOkay} from '../scripts/ripple-hydration-application.mjs';
function driver(variant) {
  const calls=[];let clicks=0,started=false,cleaned=false;
  const event=(type,path_threw)=>({type,path_threw,target_id:'replay-peer',peer_present:true});
  const snapshot=()=>({clicks,deliveries:clicks===1?[event('mousedown',true),event('click',true)]
    :[event('mousedown',true),event('click',true),event('mousedown',false),event('click',false)],
    actual_peer_directive_present:true,actual_owned_renderer_present:true,owned_ripple_launches:clicks,peer_ripple_launches:clicks});
  return {calls,get cleaned(){return cleaned;},async pointerClick(point) {
    assert.deepEqual(point,{x:10,y:20});calls.push(started?'live-input':'early-input');
    if(variant==='input-failed'&&!started)throw Error('Native input unavailable');
    if(started)clicks++;
  },async evaluate(expression) {
    if(expression==='window.__hydrationFailure || ""')return '';
    if(expression==='window.__hydrationGateReady === true')return true;
    if(expression.includes('window.__hydrationNative = []')){calls.push('observe-server');return {before_bootstrap:true,server_hydration_metadata:true,point:{x:10,y:20}};}
    if(expression.includes('return {events:window.__hydrationNative')){calls.push('record-input');return {events:['mousedown','mouseup','click'].map(type=>({type,trusted:true,target_id:'replay-peer'})),still_before:true};}
    if(expression==='window.__startHydration()'){calls.push('release-bootstrap');assert.equal(started,false);started=true;clicks=1;return true;}
    if(expression==='window.__hydrationSnapshot?.().clicks === 1')return clicks===1;
    if(expression==='window.__hydrationSnapshot?.().clicks === 2')return clicks===2;
    if(expression==='window.__hydrationSnapshot()')return snapshot();
    if(expression.includes('window.__hydrationSSRButton ==='))return true;
    if(expression==='window.__destroyHydration()'){calls.push('destroy');return;}
    if(expression==='document.querySelectorAll(".mat-ripple-element").length === 0')return true;
    if(expression.includes('return {destroyed:'))return {destroyed:true,remaining_ripple_nodes:0,window_errors:[]};
    if(expression.includes('if (window.__destroyHydration')){calls.push('finally-cleanup');cleaned=true;return;}
    throw Error('Unknown driver expression: '+expression);
  }};
}
const positive=driver('live');assert.equal(rippleHydrationReplayOkay(await observeHydrationReplay(positive)),true);
assert.deepEqual(positive.calls,['observe-server','early-input','record-input','release-bootstrap','live-input','destroy','finally-cleanup']);
const failed=driver('input-failed');await assert.rejects(()=>observeHydrationReplay(failed),/Native input unavailable/);
assert.equal(failed.cleaned,true);assert.ok(!failed.calls.includes('release-bootstrap'));
console.log(JSON.stringify({protocol_cases:2,failure_cleanup:true,native_or_angular_replay_executed:false}));
