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
import {publicRippleReplaySample} from './ripple_public_replay_sample.mjs';
function driver(variant) {
  const calls=[];let clicks=0,started=false,cleaned=false,native=false,fault=false,publicPhase='before-bootstrap',publicLive=false;
  const event=(type,path_threw)=>({type,path_threw,target_id:'replay-peer',peer_present:true});
  const snapshot=()=>({angular_zone_entered:true,clicks,deliveries:clicks===1?[event('mousedown',true),event('click',true)]
    :[event('mousedown',true),event('click',true),event('mousedown',false),event('click',false)],
    actual_peer_directive_present:true,actual_owned_renderer_present:true,owned_ripple_launches:clicks,peer_ripple_launches:clicks});
  return {calls,get cleaned(){return cleaned;},async pointerClick(point) {
    if(point.x===30&&point.y===40){calls.push(started?'public-live-input':'public-early-input');
      if(variant==='public-input-failed')throw Error('Public peer input unavailable');
      if(started)publicLive=true;return;
    }
    assert.deepEqual(point,{x:10,y:20});calls.push(native?(fault?'native-fault':'native-normal'):started?'live-input':'early-input');
    if(variant==='input-failed'&&!started)throw Error('Native input unavailable');
    if(variant==='native-failed'&&native)throw Error('Native-only input unavailable');
    if(started&&!native)clicks++;
  },async evaluate(expression) {
    if(expression.includes("const host = document.getElementById('replay-native-peer')")){
      calls.push('public-observe-server');return {selector:'#replay-native-peer',before_bootstrap:true,preexisting_ripples:0,point:{x:30,y:40}};
    }
    if(expression.includes('state.observer.disconnect()')){calls.push('public-cleanup');return {observer_disconnected:true,listeners_removed:true};}
    if(expression.includes('state.phase = "replay"')){calls.push('public-mark-replay');publicPhase='replay';return true;}
    if(expression.includes('state.phase = "live"')){calls.push('public-mark-live');publicPhase='live';return true;}
    if(expression.includes('snapshot = window.__hydrationSnapshot()')){calls.push('public-snapshot-'+publicPhase);return publicRippleReplaySample()[publicPhase==='live'?'live':'replayed'];}
    if(expression==='window.__hydrationSnapshot?.().native_replay_deliveries?.length === 3')return started&&!publicLive;
    if(expression==='window.__hydrationSnapshot?.().native_replay_deliveries?.length === 6')return started&&publicLive;
    if(expression==='window.__hydrationFailure || ""')return '';
    if(expression==='window.__hydrationGateReady === true')return true;
    if(expression.includes('window.__hydrationNative = []')){calls.push('observe-server');return {before_bootstrap:true,server_hydration_metadata:true,point:{x:10,y:20}};}
    if(expression.includes('return {events:window.__hydrationNative')){calls.push('record-input');return {events:['mousedown','mouseup','click'].map(type=>({type,trusted:true,target_id:'replay-peer'})),still_before:true};}
    if(expression==='window.__startHydration()'){calls.push('release-bootstrap');assert.equal(started,false);started=true;clicks=1;return true;}
    if(expression==='window.__hydrationSnapshot?.().clicks === 1')return clicks===1;
    if(expression==='window.__hydrationSnapshot?.().clicks === 2')return clicks===2;
    if(expression==='window.__hydrationSnapshot()')return snapshot();
    if(expression.includes("const host = document.getElementById('native-peer')")){native=true;calls.push('observe-native-peer');return {x:10,y:20};}
    if(expression.includes("state.phase = 'fault'")){fault=true;calls.push('begin-native-fault');return;}
    if(expression.includes('normal_input:state.normal_input.slice()'))return {phase:'fault',normal_creations:1,fault_creations:1,path_calls:1,
      normal_input:['mousedown','mouseup','click'].map(type=>({type,trusted:true,target_id:'native-peer'})),
      fault_input:['mousedown','mouseup','click'].map(type=>({type,trusted:true,target_id:'native-peer'})),normal_errors:[],fault_errors:[]};
    if(expression.includes('window.__rippleNativeObserver?.disconnect()')){calls.push('native-cleanup');return;}
    if(expression.includes('window.__hydrationSSRButton ==='))return true;
    if(expression==='window.__destroyHydration()'){calls.push('destroy');return;}
    if(expression==='document.querySelectorAll(".mat-ripple-element").length === 0')return true;
    if(expression.includes('return {destroyed:'))return {destroyed:true,remaining_ripple_nodes:0,window_errors:[]};
    if(expression.includes('if (window.__destroyHydration')){calls.push('finally-cleanup');cleaned=true;return;}
    throw Error('Unknown driver expression: '+expression);
  }};
}
const positive=driver('live');assert.equal(rippleHydrationReplayOkay({...await observeHydrationReplay(positive),runtime:'zoneful'},'main'),true);
assert.deepEqual(positive.calls.filter(call=>!call.startsWith('public-')),['observe-server','early-input','record-input','release-bootstrap','live-input',
  'observe-native-peer','native-normal','begin-native-fault','native-fault','native-cleanup','destroy','finally-cleanup']);
const failed=driver('input-failed');await assert.rejects(()=>observeHydrationReplay(failed),/Native input unavailable/);
assert.equal(failed.cleaned,true);assert.ok(!failed.calls.includes('release-bootstrap'));
const nativeFailed=driver('native-failed');await assert.rejects(()=>observeHydrationReplay(nativeFailed),/Native-only input unavailable/);
assert.equal(nativeFailed.cleaned,true);assert.ok(nativeFailed.calls.includes('native-cleanup'));
const publicFailed=driver('public-input-failed');await assert.rejects(()=>observeHydrationReplay(publicFailed),/Public peer input unavailable/);
assert.equal(publicFailed.cleaned,true);assert.ok(publicFailed.calls.includes('public-cleanup'));assert.ok(!publicFailed.calls.includes('release-bootstrap'));
assert.deepEqual(positive.calls.filter(call=>call.startsWith('public-')),['public-observe-server','public-early-input','public-mark-replay',
  'public-snapshot-replay','public-mark-live','public-live-input','public-snapshot-live','public-cleanup','public-cleanup']);
console.log(JSON.stringify({protocol_cases:3,additional_public_route_protocol_cases:2,failure_cleanup:true,native_or_angular_replay_executed:false}));
