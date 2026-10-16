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
  const trace = () => ({same_target_after: true,
    trusted_events: enabled ? [event('transitionstart', true, 10, 0), event('transitionend', true, 510, 500)] : [],
    duplicate_end_controls: [event('transitionend', false, 512, 0), event('transitionend', false, 512, 0)],
    cleanup: {subscription_closed: true, listeners_removed: true}});
  const origin = direction => ({...trace(), direction, created_after_observation: true, final_visible: true,
    duration_ms: enabled ? 500 : 0, notifications: 1, completion_at_ms: enabled ? 511 : 2,
    rendered_at_start: enabled, wrapper_height_at_start: enabled ? 90 : null, final_wrapper_height: 90});
  return {native_departure: {...trace(), duration_ms: enabled ? 500 : 0, rendered_at_start: enabled,
      content_at_start: enabled, final_hidden: true, content_detached: true},
    origins: {left: origin('left'), right: origin('right')}, selector: '.mat-tab-body-content', selectorMatches: true, durationMs: enabled ? 500 : 0,
    finalState: 'visible', notifications: 1, duplicateEndEventsDispatched: true, detectChangesCalls: 0,
    native_transition: {same_target_after: true, completion_at_ms: enabled ? 511 : 2,
      trusted_events: enabled ? [event('transitionstart', true, 10, 0), event('transitionend', true, 510, 500)] : [],
      duplicate_end_controls: [event('transitionend', false, 512, 0), event('transitionend', false, 512, 0)],
      cleanup: {subscription_closed: true, listeners_removed: true}}};
}
