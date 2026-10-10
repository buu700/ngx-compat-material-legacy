/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Public directive-only input; no manual launch or private upstream invocation. */
export async function observePublicRippleNativeEvents({evaluate, pointerClick}) {
  try {
    const point = await evaluate(`(() => {
      const host = document.getElementById('native-peer');
      if (!host) throw Error('Directive-only native ripple host absent');
      window.__rippleNative = {phase:'normal', normal_creations:0, fault_creations:0,
        normal_input:[], fault_input:[], normal_errors:[], fault_errors:[], path_calls:0};
      const state = window.__rippleNative;
      window.__rippleNativeObserver = new MutationObserver(records => {
        for (const record of records) for (const node of record.addedNodes) {
          if (node instanceof Element && node.classList.contains('mat-ripple-element')) {
            if (state.phase === 'normal') state.normal_creations++; else state.fault_creations++;
          }
        }
      });
      window.__rippleNativeObserver.observe(host, {childList:true});
      window.__rippleNativeError = event => {
        const message = String(event.error || event.message);
        if (state.phase === 'normal') state.normal_errors.push(message); else state.fault_errors.push(message);
      };
      window.addEventListener('error', window.__rippleNativeError);
      window.__rippleNativeInput = event => {
        if (event.target !== host) return;
        const rows = state.phase === 'normal' ? state.normal_input : state.fault_input;
        rows.push({type:event.type, trusted:event.isTrusted, target_id:host.id});
        if (state.phase === 'fault' && event.type === 'mousedown') {
          Object.defineProperty(event, 'composedPath', {value() {
            state.path_calls++; throw Error('__PEER_COMPOSED_PATH_CONTROL__');
          }});
        }
      };
      // Window capture precedes the peer's existing document-capture listener.
      ['mousedown','mouseup','click'].forEach(type => window.addEventListener(type, window.__rippleNativeInput, true));
      const rect = host.getBoundingClientRect();
      return {x:rect.x+rect.width/2, y:rect.y+rect.height/2};
    })()`);
    await pointerClick(point);
    await evaluate(`(() => {
      const state = window.__rippleNative;
      if (state.normal_creations !== 1) throw Error('Public peer native event produced no unique ripple');
      state.phase = 'fault'; window.__rippleNativeFaultActive = true;
    })()`);
    await pointerClick(point);
    return await evaluate(`(() => {
      const state = window.__rippleNative;
      return {...state, normal_input:state.normal_input.slice(), fault_input:state.fault_input.slice(),
        normal_errors:state.normal_errors.slice(), fault_errors:state.fault_errors.slice()};
    })()`);
  } finally {
    await evaluate(`(() => {
      window.__rippleNativeObserver?.disconnect();
      if (window.__rippleNativeError) window.removeEventListener('error', window.__rippleNativeError);
      if (window.__rippleNativeInput) ['mousedown','mouseup','click'].forEach(type =>
        window.removeEventListener(type, window.__rippleNativeInput, true));
      window.__rippleNativeFaultActive = false;
    })()`);
  }
}

/** Controlled faults are diagnostic evidence, never a claim that the21 peer contains the fix. */
export function publicRippleNativeEventsOkay(row, line) {
  if (!['main', '21.x'].includes(line) || !row || row.phase !== 'fault'
    || row.normal_creations !== 1 || !Array.isArray(row.normal_errors) || row.normal_errors.length
    || !Number.isInteger(row.path_calls) || row.path_calls < 1) return false;
  for (const events of [row.normal_input, row.fault_input]) {
    if (!Array.isArray(events) || events.length !== 3
      || events.map(event => event.type).join(',') !== 'mousedown,mouseup,click'
      || !events.every(event => event.trusted === true && event.target_id === 'native-peer')) return false;
  }
  if (!Array.isArray(row.fault_errors)) return false;
  return line === 'main' ? row.fault_creations === 1 && row.fault_errors.length === 0
    : row.fault_creations === 0 && row.fault_errors.length > 0
      && row.fault_errors.every(message => typeof message === 'string' && message.includes('__PEER_COMPOSED_PATH_CONTROL__'));
}
