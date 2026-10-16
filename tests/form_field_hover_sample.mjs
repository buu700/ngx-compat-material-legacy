/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Explicitly synthetic native input, never CSS or browser qualification. */
export function formFieldHoverSample() {
  const scenarios = [
    ['peer-form-hover', 'rgba(0, 0, 0, 0.87)', '0.04', '0.12'],
    ['peer-form-hover-dark', 'rgba(255, 255, 255, 0.87)', '0.08', '0.24'],
  ].map(([id, ink, hover, focus], index) => {
    const state = (opacity, host, wrapper, focused) => ({present: true, overlay_present: true,
      host_hovered: host, wrapper_hovered: wrapper, focused, opacity, background_color: ink,
      state_layer_color: ink, hover_token: hover, focus_token: focus});
    return {id, baseline: state('0', false, false, false),
      wrapper: {...state(hover, true, true, false), point: {x: 120, y: 100 + index * 120, width: 180, height: 56}},
      hint: {...state(hover, true, false, false), point: {x: 120, y: 144 + index * 120, width: 180, height: 20}},
      focus: state(focus, false, false, true), negative: {...state('0.73', true, true, false), hover_token: '0.73'},
      restored: state(hover, true, true, false)};
  });
  return {hover_media: true, compiled_theme_css_sha256: 'c'.repeat(64), state_tokens_okay: true,
    baseline: structuredClone(scenarios[0].baseline), wrapper: structuredClone(scenarios[0].wrapper), hint: structuredClone(scenarios[0].hint),
    state_token_scenarios: scenarios};
}
