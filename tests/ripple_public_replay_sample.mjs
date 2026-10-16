/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Synthetic predicate/protocol sample. Never native replay or applicability evidence. */
export function publicRippleReplaySample() {
  const native = () => ['mousedown','mouseup','click'].map(type => ({type,trusted:true,target_id:'replay-native-peer'}));
  const delivered = replay => ['mousedown','mouseup','click'].map(type => ({type,path_threw:replay,target_id:'replay-native-peer',peer_present:true}));
  const replayed = {phase:'replay', captured_native:native(), live_native:[], creations:[], ssr_node_reused:true,
    actual_peer_directive_present:true, deliveries:delivered(true)};
  return {selector:'#replay-native-peer', before_bootstrap:true, preexisting_ripples:0,
    replayed, live:{...structuredClone(replayed),phase:'live',live_native:native(),
      creations:[{phase:'live',target_id:'replay-native-peer',connected:true}],deliveries:[...delivered(true),...delivered(false)]},
    observer_disconnected:true,listeners_removed:true};
}
