/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// The finite mapping is based on Material 22.1.7's shipped structural CSS.
// [token suffix, state, target, computed property, pseudo-element]
const common = [
 ['caret-color','normal','input','caretColor'],
 ['focus-label-text-color','focus','.mdc-floating-label','color'],
 ['label-text-color','normal','.mdc-floating-label','color'],
 ['disabled-label-text-color','disabled','.mdc-floating-label','color'],
 ['input-text-color','normal','input','color'],
 ['disabled-input-text-color','disabled','input','color'],
 ['input-text-placeholder-color','normal','input','color','::placeholder'],
 ['error-caret-color','error','input','caretColor'],
 ['error-focus-label-text-color','error-focus','.mdc-floating-label','color'],
 ['error-label-text-color','error','.mdc-floating-label','color'],
 ['hover-label-text-color','hover','.mdc-floating-label','color'],
 ['error-hover-label-text-color','error-hover','.mdc-floating-label','color'],
];
const specific = {
 filled: [
  ['focus-active-indicator-color','focus','.mdc-line-ripple','borderBottomColor','::after'],
  ['container-color','normal','.mdc-text-field','backgroundColor'],
  ['disabled-container-color','disabled','.mdc-text-field','backgroundColor'],
  ['active-indicator-color','normal','.mdc-line-ripple','borderBottomColor','::before'],
  ['disabled-active-indicator-color','disabled','.mdc-line-ripple','borderBottomColor','::before'],
  ['hover-active-indicator-color','hover','.mdc-line-ripple','borderBottomColor','::before'],
  ['error-active-indicator-color','error','.mdc-line-ripple','borderBottomColor','::before'],
  ['error-focus-active-indicator-color','error-focus','.mdc-line-ripple','borderBottomColor','::after'],
  ['error-hover-active-indicator-color','error-hover','.mdc-line-ripple','borderBottomColor','::before'],
 ],
 outlined: [
  ['focus-outline-color','focus','.mdc-notched-outline__leading','borderTopColor'],
  ['outline-color','normal','.mdc-notched-outline__leading','borderTopColor'],
  ['disabled-outline-color','disabled','.mdc-notched-outline__leading','borderTopColor'],
  ['hover-outline-color','hover','.mdc-notched-outline__leading','borderTopColor'],
  ['error-focus-outline-color','error-focus','.mdc-notched-outline__leading','borderTopColor'],
  ['error-hover-outline-color','error-hover','.mdc-notched-outline__leading','borderTopColor'],
  ['error-outline-color','error','.mdc-notched-outline__leading','borderTopColor'],
 ],
};
export const PLAN = Object.freeze(Object.entries(specific).flatMap(([appearance,rows]) =>
 [...common,...rows].map(([suffix,state,target,property,pseudo=null]) =>
  Object.freeze({appearance,token:`${appearance}-${suffix}`,state,target,property,pseudo}))));
if (PLAN.length !== 40 || new Set(PLAN.map(row=>row.token)).size !== 40)
 throw Error('form-field color observation roster changed');
export function observationOkay(row) {
 return !!row && row.state_ok === true && row.target_present === true
   && typeof row.baseline === 'string' && row.baseline === row.expected
   && row.negative === 'rgb(255, 0, 255)' && row.negative !== row.baseline
   && row.recovered === row.baseline && row.original_style === row.restored_style;
}
