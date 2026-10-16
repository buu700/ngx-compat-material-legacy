/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact producer browser programs on explicit DOM/event/observer protocols. */
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import {installPublicRippleReplayObserver, markPublicRippleReplayPhase, snapshotPublicRippleReplayObserver,
  cleanupPublicRippleReplayObserver, publicRippleReplayOkay} from '../scripts/ripple-public-replay-probe.mjs';
import {rippleHydrationComponentFixture} from '../scripts/ripple-hydration-component-fixture.mjs';
import {publicRippleReplaySample} from './ripple_public_replay_sample.mjs';
const ts = createRequire(import.meta.url)('typescript');
const parsed = ts.createSourceFile('component.ts',rippleHydrationComponentFixture,ts.ScriptTarget.Latest,true);
const owner = parsed.statements.find(node => ts.isClassDeclaration(node) && node.name.text === 'RippleHydrationLab');
const method = owner.members.find(node => node.name?.getText(parsed) === 'nativeReplay');
assert.ok(method); assert.doesNotMatch(method.getText(parsed), /launch\(|handleEvent\(|dispatchEvent\(/);
const emitted = ts.transpileModule('class Observer {'+method.getText(parsed)+'}',
  {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const listeners = new Map(), deliveries = [];
class ElementProtocol {constructor(id,classes=[]){this.id=id;this.classList={contains:name=>classes.includes(name)};this.isConnected=true;}}
const host = new ElementProtocol('replay-native-peer');
host.getBoundingClientRect = () => ({x:20,y:30,width:20,height:20});
host.querySelectorAll = () => [];
let observer;
class MutationObserverProtocol {
  constructor(callback){this.callback=callback;this.records=[];this.disconnected=false;observer=this;}
  observe(target,options){assert.equal(target,host);assert.equal(JSON.stringify(options),JSON.stringify({childList:true,subtree:true}));}
  takeRecords(){const records=this.records;this.records=[];return records;}
  disconnect(){this.disconnected=true;}
}
const window = {__hydrationBootstrapped:false,__hydrationSnapshot:()=>({actual_native_replay_peer_present:true,native_replay_deliveries:deliveries.slice()})};
const document = {getElementById:id=>id==='replay-native-peer'?host:null,
  addEventListener(type,fn,capture){assert.equal(capture,true);listeners.set(type,fn);},
  removeEventListener(type,fn,capture){assert.equal(capture,true);assert.equal(listeners.get(type),fn);listeners.delete(type);}};
const context = {window,document,Element:ElementProtocol,HTMLElement:ElementProtocol,MutationObserver:MutationObserverProtocol};
const driver = {evaluate:async expression=>JSON.parse(JSON.stringify(runInNewContext(expression,context)))};
const Handler = runInNewContext(emitted+';Observer',context), handler = new Handler();
handler.nativeReplayDeliveries=deliveries;handler.replayNativePeer={launch(){throw Error('diagnostic handler manually launched');}};
const before = await installPublicRippleReplayObserver(driver);assert.equal(listeners.size,3);
for (const type of ['mousedown','mouseup','click']) listeners.get(type)({type,target:host,isTrusted:true});
await markPublicRippleReplayPhase(driver,'replay');window.__hydrationBootstrapped=true;
for (const type of ['mousedown','mouseup','click']) handler.nativeReplay({type,target:host,composedPath(){throw Error('synthetic hybrid protocol');}});
const replayed = await snapshotPublicRippleReplayObserver(driver);assert.equal(replayed.creations.length,0);
await markPublicRippleReplayPhase(driver,'live');
for (const type of ['mousedown','mouseup','click']) {
  const event={type,target:host,isTrusted:true,composedPath:()=>[host]};listeners.get(type)(event);handler.nativeReplay(event);
}
// Queue a DOM observer record; the exact snapshot program must drain it itself.
observer.records.push({addedNodes:[new ElementProtocol('', ['mat-ripple-element'])]});
const live = await snapshotPublicRippleReplayObserver(driver), cleanup = await cleanupPublicRippleReplayObserver(driver);
assert.equal(observer.disconnected,true);assert.equal(listeners.size,0);
const row = {...before,replayed,live,...cleanup};assert.equal(publicRippleReplayOkay(row),true);
await assert.rejects(markPublicRippleReplayPhase(driver,'unknown'),/Unknown public replay phase/);
const sample=publicRippleReplaySample();assert.equal(publicRippleReplayOkay(sample),true);
const mutations=[
 r=>{r.selector='#replay-peer';},r=>{r.before_bootstrap=false;},r=>{r.preexisting_ripples=1;},
 r=>{r.replayed.phase='live';},r=>{r.replayed.ssr_node_reused=false;},r=>{r.replayed.actual_peer_directive_present=false;},
 r=>{r.replayed.captured_native[0].trusted=false;},r=>{r.replayed.captured_native.reverse();},r=>{r.replayed.captured_native.pop();},
 r=>{r.replayed.live_native.push({});},r=>{r.replayed.creations.push({});},r=>{r.replayed.deliveries[0].path_threw=false;},
 r=>{r.replayed.deliveries[0].target_id='other';},r=>{r.replayed.deliveries[0].peer_present=false;},r=>{r.replayed.deliveries.reverse();},
 r=>{r.live.phase='replay';},r=>{r.live.ssr_node_reused=false;},r=>{r.live.actual_peer_directive_present=false;},
 r=>{r.live.captured_native[0].target_id='other';},r=>{r.live.live_native[0].trusted=false;},r=>{r.live.live_native.pop();},
 r=>{r.live.creations=[];},r=>{r.live.creations.push({...r.live.creations[0]});},r=>{r.live.creations[0].phase='replay';},
 r=>{r.live.creations[0].target_id='other';},r=>{r.live.creations[0].connected=false;},r=>{r.live.deliveries.pop();},
 r=>{r.live.deliveries[0].path_threw=false;},r=>{r.live.deliveries[3].path_threw=true;},
 r=>{r.observer_disconnected=false;},r=>{r.listeners_removed=false;},
];
for (const change of mutations) {const bad=structuredClone(sample);change(bad);assert.equal(publicRippleReplayOkay(bad),false);}
assert.equal(publicRippleReplayOkay(null),false);
console.log(JSON.stringify({exact_browser_programs:true,whole_diagnostic_handler:true,negative_controls:mutations.length,
  source_protocol_only:true,actual_native_or_Angular_replay:false,source_disposition_closed:false}));
