/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Authentic exact-floor source analysis and corrupted source controls; no private runtime calls. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectRippleReplaySourceRoute,reviewRippleReplayRouteSources} from '../scripts/ripple-replay-route-source.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const observed=inspectRippleReplaySourceRoute({root}),cases=[];
assert.equal(observed.lines.length,2);assert.deepEqual(observed.lines.map(row=>row.helper_has_replay_catch),[true,false]);
const namespace='compatibility/rc/material-public-subjects.json';
assert.throws(()=>inspectRippleReplaySourceRoute({root,readMember:path=>path===namespace?Buffer.concat([read(path),Buffer.from(' ')]):read(path)}),/namespace changed/);cases.push({id:'changed-pinned-namespace',result:'rejected'});
for(const line of observed.lines){
 const sources={fixture:read(observed.fixture.path).toString()};
 for(const member of line.authenticated_source_members){
  const stored=read(member.path),raw=member.path.endsWith('.gz')?gunzipSync(stored):stored;
  let key;if(member.package==='@angular/core')key=member.module_path==='fesm2022/core.mjs'?'core':member.module_path==='fesm2022/_debug_node-chunk.mjs'?'debug':'primitives';
  else if(member.package==='@angular/material')key='material';else if(member.package==='@angular/cdk')key='cdk';else key=member.module_path.endsWith('.d.ts')?'platformTypes':'platform';
  sources[key]=raw.toString();
  const corrupted=Buffer.concat([stored,Buffer.from(' ')]);
  assert.throws(()=>inspectRippleReplaySourceRoute({root,readMember:path=>path===member.path?corrupted:read(path)}),/stored member changed/);cases.push({id:line.line+'-changed-authentic-member-'+key,result:'rejected'});
 }
 assert.equal(reviewRippleReplayRouteSources({line:line.line,...sources}).helper_has_replay_catch,line.helper_has_replay_catch);
 const mutations=[
  ['provider-public-stability','platformTypes','declare function withEventReplay','/** @deprecated */\ndeclare function withEventReplay'],
  ['registered-target-identity','core','invokeRegisteredReplayListeners(injector, event, event.currentTarget)','invokeRegisteredReplayListeners(injector, event, event.target)'],
  ['dispatcher-registration','core','registerDispatcher(eventContract, dispatcher);',''],
  ['stashed-listener-map','debug','currentTarget?.__jsaction_fns?.get(event.type)','currentTarget?.otherCallbacks?.get(event.type)'],
  ['listener-event-identity','debug','    handler(event);','    handler({});'],
  ['replay-event-path-patch','primitives',"patchEventInstance(event, 'composedPath',", "patchEventInstance(event, 'otherPath',"],
  ['native-document-receiver','material','document.addEventListener(name, this._delegateEventHandler,','element.addEventListener(name, this._delegateEventHandler,'],
  ['native-target-delegation','material','const target = _getEventTarget(event);','const target = event.target;'],
  ['angular-host-listener','material','    host: {\n      properties:',"    host: {listeners: {mousedown: 'launch()'},\n      properties:"],
  ['manual-native-replay-launch','fixture','    this.nativeReplayDeliveries.push','    this.replayNativePeer.launch(0, 0);\n    this.nativeReplayDeliveries.push'],
 ];
 for(const [id,key,before,after]of mutations){assert.ok(sources[key].includes(before),id+' mutation anchor missing');const changed={...sources,[key]:sources[key].replace(before,after)};
  assert.throws(()=>reviewRippleReplayRouteSources({line:line.line,...changed}),undefined,id);cases.push({id:line.line+'-'+id,result:'rejected'});
 }
 const init=line.complete_subjects.find(row=>row.role==='core-replay-setup').complete_source;
 assert.ok(sources.core.includes(init));const withDispatch=init.replace('registerDispatcher(eventContract, dispatcher);','document.dispatchEvent(new Event(\'click\'));\n  registerDispatcher(eventContract, dispatcher);');assert.notEqual(init,withDispatch);
 assert.throws(()=>reviewRippleReplayRouteSources({line:line.line,...sources,core:sources.core.replace(init,withDispatch)}),/redispatches/);cases.push({id:line.line+'-native-redispatch-in-replay-chain',result:'rejected'});
 const helper=line.complete_subjects.find(row=>row.role==='private-target-helper').complete_source;
 const changedHelper=line.line==='main'?helper.replace('catch {}','finally {}'):helper.replace('{','{ try {} catch {}');assert.notEqual(helper,changedHelper);
 assert.throws(()=>reviewRippleReplayRouteSources({line:line.line,...sources,cdk:sources.cdk.replace(helper,changedHelper)}),/catch differs/);cases.push({id:line.line+'-wrong-private-floor-catch',result:'rejected'});
}
const result={schema_version:1,scope:'Exact complete minimum source route and semantic/authenticity controls only; source strings are parsed, never invoked.',controls:cases.length,cases,analysis:observed,source_helper_sha256:hash(read('scripts/ripple-replay-route-source.mjs')),producer_sha256:hash(read('tests/ripple_replay_route_source_probe.mjs')),private_symbols_invoked:false,actual_angular_native_or_packed_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({lines:2,controls:cases.length,helper_catch:{main:true,'21.x':false},private_symbols_invoked:false,actual_angular_native_or_packed_qualified:false}));
