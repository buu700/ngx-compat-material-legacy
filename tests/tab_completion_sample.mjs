/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Synthetic raw data only; this is not a native transition or tagged golden. */
export function tabCompletionMotionSample(mode) {
  const enabled = mode === 'enabled';
  const event = (type, trusted, at_ms, elapsed_ms) => ({type, trusted, property: 'transform', same_target: true, connected: true, at_ms, elapsed_ms});
  return {selector: '.mat-tab-body-content', selectorMatches: true, durationMs: enabled ? 500 : 0,
    finalState: 'visible', notifications: 1, duplicateEndEventsDispatched: true, detectChangesCalls: 0,
    native_transition: {same_target_after: true, completion_at_ms: enabled ? 511 : 2,
      trusted_events: enabled ? [event('transitionstart', true, 10, 0), event('transitionend', true, 510, 500)] : [],
      duplicate_end_controls: [event('transitionend', false, 512, 0), event('transitionend', false, 512, 0)],
      cleanup: {subscription_closed: true, listeners_removed: true}}};
}
