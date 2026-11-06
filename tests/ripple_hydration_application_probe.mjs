/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {rippleHydrationApplication, rippleHydrationReplayOkay} from '../scripts/ripple-hydration-application.mjs';
import {publicRippleReplaySample} from './ripple_public_replay_sample.mjs';
const require = createRequire(import.meta.url), ts = require('typescript');
const sha = value => createHash('sha256').update(value).digest('hex');
let specifications = 0;
for (const line of ['main','21.x']) for (const runtime of ['zoneful','zoneless']) {
  const spec = rippleHydrationApplication(line,runtime), major = line === 'main' ? '22' : '21';
  const record = JSON.parse(readFileSync(new URL(`../compatibility/rc/hydration-build-schema-${major}.json`,import.meta.url)));
  assert.equal(record.archive_sri_verified,true);
  const options = spec.angular.projects.replay.architect.build.options;
  for (const key of Object.keys(options)) assert.ok(Object.hasOwn(record.schema.properties,key),key);
  for (const key of record.schema.required) assert.ok(Object.hasOwn(options,key),key);
  assert.equal(options.ssr.entry,'src/server.ts');
  assert.equal(options.polyfills.length,runtime === 'zoneful' ? 1 : 0);
  assert.equal(spec.tsconfig.compilerOptions.skipLibCheck,false);
  assert.equal(spec.angular.projects.replay.architect.build.builder,'@angular/build:application');
  assert.equal(spec.dependencies['@angular/platform-server'],spec.dependencies['@angular/core']);
  assert.equal(spec.dependencies['@angular/ssr'],spec.dependencies['@angular/core']);
  assert.equal(spec.dependencies['@angular/cdk'],line === 'main' ? '22.1.7' : '21.2.14');
  assert.equal(spec.dependencies.rxjs,'7.5.5');
  assert.equal(spec.dependencies.typescript,line === 'main' ? '6.0.2' : '5.9.2');
  assert.ok(!Object.hasOwn(spec.dependencies,'@angular/animations'));
  for (const [path, source] of Object.entries(spec.files)) if(path.endsWith('.ts')) {
    assert.equal(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,
      experimentalDecorators:true},reportDiagnostics:true,fileName:path}).diagnostics.length,0,path);
    assert.doesNotMatch(source,/CommonEngine|ɵ|__jsaction_bootstrap|dispatchEvent\(|composedPath\s*=/);
  }
  specifications++;
}
assert.throws(()=>rippleHydrationApplication('next','zoneful'));
assert.throws(()=>rippleHydrationApplication('main','other'));
const event = (type, replay) => ({type,path_threw:replay,target_id:'replay-peer',peer_present:true});
const snapshot = replay => ({angular_zone_entered:true,clicks:replay?1:2,deliveries:replay?[event('mousedown',true),event('click',true)]
  :[event('mousedown',true),event('click',true),event('mousedown',false),event('click',false)],
  actual_peer_directive_present:true,actual_owned_renderer_present:true,owned_ripple_launches:replay?1:2,peer_ripple_launches:replay?1:2});
const positive = {runtime:'zoneful',server_hydration_metadata:true,before_bootstrap:true,
  captured_native:['mousedown','mouseup','click'].map(type=>({type,trusted:true,target_id:'replay-peer'})),
  ssr_button_reused:true,window_errors:[],replayed:snapshot(true),live:snapshot(false),destroyed:true,remaining_ripple_nodes:0,
  public_peer_replay:publicRippleReplaySample()};
const nativeEvents = line => ({phase:'fault', normal_creations:1, fault_creations:line==='main'?1:0,
  normal_input:['mousedown','mouseup','click'].map(type=>({type,trusted:true,target_id:'native-peer'})),
  fault_input:['mousedown','mouseup','click'].map(type=>({type,trusted:true,target_id:'native-peer'})),
  normal_errors:[], fault_errors:line==='main'?[]:['Error: __PEER_COMPOSED_PATH_CONTROL__'], path_calls:1});
for(const line of ['main','21.x']) assert.equal(rippleHydrationReplayOkay({...positive,native_peer_events:nativeEvents(line)},line),true);
const zonelessPositive=structuredClone(positive);zonelessPositive.runtime='zoneless';zonelessPositive.replayed.angular_zone_entered=false;zonelessPositive.live.angular_zone_entered=false;zonelessPositive.native_peer_events=nativeEvents('main');assert.equal(rippleHydrationReplayOkay(zonelessPositive,'main'),true);
const wrongZoneless=structuredClone(zonelessPositive);wrongZoneless.replayed.angular_zone_entered=true;assert.equal(rippleHydrationReplayOkay(wrongZoneless,'main'),false);
positive.native_peer_events=nativeEvents('main');
const mutants = [
  row=>{delete row.runtime;}, row=>{row.runtime='zoneless';}, row=>{delete row.replayed.angular_zone_entered;}, row=>{row.live.angular_zone_entered=false;},
  row=>{row.server_hydration_metadata=false;}, row=>{row.before_bootstrap=false;},
  row=>{row.captured_native[0].trusted=false;}, row=>{row.captured_native.pop();},
  row=>{row.ssr_button_reused=false;}, row=>{row.window_errors.push('composedPath failure');},
  row=>{row.replayed.clicks=0;}, row=>{row.replayed.actual_peer_directive_present=false;},
  row=>{row.replayed.actual_owned_renderer_present=false;}, row=>{row.replayed.deliveries[0].path_threw=false;},
  row=>{row.replayed.deliveries[0].target_id='';}, row=>{row.replayed.deliveries.reverse();},
  row=>{row.replayed.owned_ripple_launches=0;}, row=>{row.replayed.peer_ripple_launches=0;},
  row=>{row.live.clicks=1;}, row=>{row.live.deliveries[2].path_threw=true;},
  row=>{row.live.owned_ripple_launches=1;}, row=>{row.live.peer_ripple_launches=1;},
  row=>{row.destroyed=false;}, row=>{row.remaining_ripple_nodes=1;},
  row=>{delete row.native_peer_events;}, row=>{row.native_peer_events.normal_creations=0;},
  row=>{row.native_peer_events.normal_input[0].trusted=false;}, row=>{row.native_peer_events.path_calls=0;},
  row=>{row.native_peer_events.normal_errors.push('unexpected');},
  row=>{row.native_peer_events.fault_errors.push('unexpected');},
];
for(const mutate of mutants) {const row=structuredClone(positive);mutate(row);assert.equal(rippleHydrationReplayOkay(row,'main'),false);}
assert.equal(rippleHydrationReplayOkay(positive,'21.x'),false);
assert.equal(rippleHydrationReplayOkay(positive),false);
const missingRoute=structuredClone(positive);delete missingRoute.public_peer_replay;assert.equal(rippleHydrationReplayOkay(missingRoute,'main'),false);
console.log(JSON.stringify({specifications,negative_mutations:mutants.length,positive_contract:true,public_route_required:true,
  source_sha256:sha(readFileSync(new URL('../scripts/ripple-hydration-application.mjs',import.meta.url))),
  native_or_packed_AOT_executed:false}));
