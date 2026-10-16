/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Observe a public directive with diagnostic Angular handlers that never launch a ripple. */
export async function installPublicRippleReplayObserver({evaluate}) {
  return evaluate(`(() => {
    const host = document.getElementById('replay-native-peer');
    if (!host) throw Error('Public replay peer host missing');
    const state = window.__publicRippleReplay = {host, phase:'before-bootstrap',
      captured_native:[], live_native:[], creations:[], observer_disconnected:false, listeners_removed:false};
    state.collect = records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node instanceof Element && node.classList.contains('mat-ripple-element')) {
          state.creations.push({phase:state.phase, target_id:host.id, connected:node.isConnected});
        }
      }
    };
    state.observer = new MutationObserver(state.collect);
    state.observer.observe(host, {childList:true, subtree:true});
    state.listener = event => {
      if (event.target !== host) return;
      const row = {type:event.type, trusted:event.isTrusted, target_id:event.target.id};
      if (state.phase === 'before-bootstrap') state.captured_native.push(row);
      else if (state.phase === 'live') state.live_native.push(row);
    };
    for (const type of ['mousedown','mouseup','click']) document.addEventListener(type, state.listener, true);
    const box = host.getBoundingClientRect();
    return {selector:'#replay-native-peer', before_bootstrap:window.__hydrationBootstrapped !== true,
      preexisting_ripples:host.querySelectorAll('.mat-ripple-element').length,
      point:{x:box.x+box.width/2,y:box.y+box.height/2}};
  })()`);
}

export async function markPublicRippleReplayPhase({evaluate}, phase) {
  if (!['replay','live'].includes(phase)) throw Error('Unknown public replay phase');
  return evaluate(`(() => {
    const state = window.__publicRippleReplay;
    state.collect(state.observer.takeRecords());
    state.phase = ${JSON.stringify(phase)};
    return true;
  })()`);
}

export async function snapshotPublicRippleReplayObserver({evaluate}) {
  return evaluate(`(() => {
    const state = window.__publicRippleReplay, snapshot = window.__hydrationSnapshot();
    state.collect(state.observer.takeRecords());
    return {phase:state.phase, captured_native:state.captured_native.slice(), live_native:state.live_native.slice(),
      creations:state.creations.slice(), ssr_node_reused:state.host === document.getElementById('replay-native-peer'),
      actual_peer_directive_present:snapshot.actual_native_replay_peer_present,
      deliveries:snapshot.native_replay_deliveries};
  })()`);
}

export async function cleanupPublicRippleReplayObserver({evaluate}) {
  return evaluate(`(() => {
    const state = window.__publicRippleReplay;
    if (!state) return {observer_disconnected:false,listeners_removed:false};
    state.collect(state.observer.takeRecords());
    state.observer.disconnect(); state.observer_disconnected = true;
    for (const type of ['mousedown','mouseup','click']) document.removeEventListener(type, state.listener, true);
    state.listeners_removed = true;
    return {observer_disconnected:state.observer_disconnected,listeners_removed:state.listeners_removed};
  })()`);
}

const kinds = ['mousedown','mouseup','click'];
const nativeInput = rows => Array.isArray(rows) && rows.length === 3 && rows.every((row,index) =>
  row.type === kinds[index] && row.trusted === true && row.target_id === 'replay-native-peer');
const deliveries = (rows, replay) => Array.isArray(rows) && rows.length === 3 && rows.every((row,index) =>
  row.type === kinds[index] && row.path_threw === replay && row.target_id === 'replay-native-peer' && row.peer_present === true);
/** Expected supported route: genuine replay reaches Angular handlers; native input
 * reaches the public ripple listener. This predicate alone cannot establish that route. */
export function publicRippleReplayOkay(row) {
  const replay = row?.replayed, live = row?.live;
  return row?.selector === '#replay-native-peer' && row.before_bootstrap === true && row.preexisting_ripples === 0
    && replay?.phase === 'replay' && replay.ssr_node_reused === true && replay.actual_peer_directive_present === true
    && nativeInput(replay.captured_native) && Array.isArray(replay.live_native) && replay.live_native.length === 0
    && Array.isArray(replay.creations) && replay.creations.length === 0 && deliveries(replay.deliveries, true)
    && live?.phase === 'live' && live.ssr_node_reused === true && live.actual_peer_directive_present === true
    && nativeInput(live.captured_native) && JSON.stringify(live.captured_native) === JSON.stringify(replay.captured_native)
    && nativeInput(live.live_native) && Array.isArray(live.creations) && live.creations.length === 1
    && live.creations[0].phase === 'live' && live.creations[0].target_id === 'replay-native-peer' && live.creations[0].connected === true
    && Array.isArray(live.deliveries) && live.deliveries.length === 6 && deliveries(live.deliveries.slice(0,3), true)
    && JSON.stringify(live.deliveries.slice(0,3)) === JSON.stringify(replay.deliveries) && deliveries(live.deliveries.slice(3), false)
    && row.observer_disconnected === true && row.listeners_removed === true;
}
