/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite native observation check. This does not grant full Sass/browser/G11 credit. */
const expected = [
  {id: 'peer-form-hover', ink: 'rgba(0, 0, 0, 0.87)', hover: '0.04', focus: '0.12'},
  {id: 'peer-form-hover-dark', ink: 'rgba(255, 255, 255, 0.87)', hover: '0.08', focus: '0.24'},
];
function stateOkay(state, values, {opacity, host, wrapper, focus}) {
  return Boolean(state && state.present === true && state.overlay_present === true
    && state.host_hovered === host && state.wrapper_hovered === wrapper && state.focused === focus
    && state.opacity === opacity && state.background_color === values.ink
    && state.state_layer_color === values.ink && state.hover_token === values.hover && state.focus_token === values.focus);
}
export function formFieldStateTokensOkay(rows) {
  return Array.isArray(rows) && rows.length === expected.length && expected.every((values, index) => {
    const row = rows[index];
    return row?.id === values.id
      && stateOkay(row.baseline, values, {opacity: '0', host: false, wrapper: false, focus: false})
      && stateOkay(row.wrapper, values, {opacity: values.hover, host: true, wrapper: true, focus: false})
      && stateOkay(row.hint, values, {opacity: values.hover, host: true, wrapper: false, focus: false})
      && stateOkay(row.focus, values, {opacity: values.focus, host: false, wrapper: false, focus: true})
      && stateOkay(row.negative, {...values, hover: '0.73'}, {opacity: '0.73', host: true, wrapper: true, focus: false})
      && stateOkay(row.restored, values, {opacity: values.hover, host: true, wrapper: true, focus: false});
  });
}
