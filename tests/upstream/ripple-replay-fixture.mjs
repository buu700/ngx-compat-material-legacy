/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Synthetic raw replay values for validator tests; no browser or application execution. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {hash} from './artifact-behavior-fixture.mjs';
import {writeSyntheticBrowserRun} from './browser-run-fixture.mjs';
import {publicRippleReplaySample} from '../ripple_public_replay_sample.mjs';
import {rippleHydrationApplication} from '../../scripts/ripple-hydration-application.mjs';
const input=host=>['mousedown','mouseup','click'].map(type=>({type,trusted:true,target_id:host}));
const delivery=(type,replay)=>({type,path_threw:replay,target_id:'replay-peer',peer_present:true});
const snapshot=(replay,runtime)=>({angular_zone_entered:runtime==='zoneful',clicks:replay?1:2,deliveries:replay?[delivery('mousedown',true),delivery('click',true)]
  :[delivery('mousedown',true),delivery('click',true),delivery('mousedown',false),delivery('click',false)],
  actual_peer_directive_present:true,actual_owned_renderer_present:true,owned_ripple_launches:replay?1:2,peer_ripple_launches:replay?1:2});
export function rippleReplayRuntimeSample(line,runtime) {
  const spec=rippleHydrationApplication(line,runtime);
  return {runtime,dependencies:spec.dependencies,source_sha256:Object.fromEntries(Object.entries(spec.files).map(([path,source])=>[path,hash(source)])),
    lock_sha256:'c'.repeat(64),browser:{launched:true,engine:'chromium',protocol:'cdp',product:'Chrome/128.0.0.0',binary:'/synthetic/chromium',port:12345},
    server_hydration_metadata:true,before_bootstrap:true,captured_native:input('replay-peer'),ssr_button_reused:true,window_errors:[],
    replayed:snapshot(true,runtime),live:snapshot(false,runtime),destroyed:true,remaining_ripple_nodes:0,public_peer_replay:publicRippleReplaySample(),
    native_peer_events:{phase:'fault',normal_creations:1,fault_creations:line==='main'?1:0,path_calls:1,
      normal_input:input('native-peer'),fault_input:input('native-peer'),normal_errors:[],
      fault_errors:line==='main'?[]:['Error: __PEER_COMPOSED_PATH_CONTROL__']},ok:true};
}
export async function writeSyntheticRippleBrowserRun(sourceRoot,fixture,makeRaw=()=>({})) {
  const browser=await writeSyntheticBrowserRun(sourceRoot,fixture,makeRaw),line=fixture.line;
  browser.observation.hydration_replay={schema_version:1,line,run_id:fixture.run.run_id,tarball_sha256:fixture.library.sha256,
    producer_sha256:hash(readFileSync(join(sourceRoot,'scripts/ripple-hydration-replay.mjs'))),node:'v24.18.0',ok:true,
    results:['zoneful','zoneless'].map(runtime=>rippleReplayRuntimeSample(line,runtime))};
  browser.save();return browser;
}
