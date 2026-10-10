/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Short-label fixture follows the independently tagged 0.75 scale and 5px padding. */
export function legacyFormFieldOutlineNativeOkay(o) {
  return !!o && !o.error && o.visible === true && o.historical_host === true &&
    ['ltr','rtl'].includes(o.direction) && Number.isInteger(o.label_children) && o.label_children > 0 &&
    Number.isFinite(o.container_width) && o.container_width > 0 &&
    Number.isFinite(o.expected_start) && Number.isFinite(o.expected_gap) && o.expected_gap > 0 &&
    Array.isArray(o.start_widths) && o.start_widths.length === 2 &&
    Array.isArray(o.gap_widths) && o.gap_widths.length === 2 &&
    o.start_widths.every(value=>Number.isFinite(value)&&Math.abs(value-o.expected_start)<=1.5) &&
    o.gap_widths.every(value=>Number.isFinite(value)&&Math.abs(value-o.expected_gap)<=1.5);
}

export function legacyFormFieldOutlineSequenceOkay(rows) {
  return Array.isArray(rows) && rows.length === 4 && rows.every(legacyFormFieldOutlineNativeOkay) &&
    rows[0].direction === 'ltr' && rows[1].direction === 'ltr' && rows[2].direction === 'ltr' && rows[3].direction === 'rtl' &&
    rows[1].expected_start > rows[0].expected_start + 1.5 &&
    Math.abs(rows[2].expected_start-rows[0].expected_start)<=1.5;
}

export async function observeLegacyFormFieldOutlineNative({evaluate}) {
  try {
    return await evaluate(`(${readLegacyFormFieldOutlineNative.toString()})(document.getElementById('ff-outline'))`);
  } catch(error){return {error:String(error.message||error)};}
}

export function readLegacyFormFieldOutlineNative(host) {
  const container=host?.querySelector('.mat-form-field-flex'),label=host?.querySelector('.mat-form-field-label');
  if(!host||!container||!label||!label.children.length)return null;
  const direction=getComputedStyle(host).direction,r=container.getBoundingClientRect(),first=label.children[0].getBoundingClientRect();
  const edge=rect=>direction==='rtl'?rect.right:rect.left;
  const labelWidth=Array.from(label.children).reduce((total,child)=>total+child.offsetWidth,0);
  return {visible:host.getBoundingClientRect().width>0&&host.getBoundingClientRect().height>0,
    historical_host:host.tagName==='MAT-FORM-FIELD'&&host.classList.contains('mat-form-field-appearance-outline'),
    direction,label_children:label.children.length,container_width:r.width,
    expected_start:Math.abs(edge(first)-edge(r))-5,expected_gap:labelWidth>0?labelWidth*0.75+10:0,
    start_widths:Array.from(container.querySelectorAll('.mat-form-field-outline-start')).map(node=>parseFloat(node.style.width)),
    gap_widths:Array.from(container.querySelectorAll('.mat-form-field-outline-gap')).map(node=>parseFloat(node.style.width))};
}

/** Independent long-label arithmetic on an actually rendered fixed host. */
export function legacyFormFieldOutlineBoundaryNativeOkay(o) {
  return legacyFormFieldOutlineNativeOkay(o) && o.fixed_host === true && o.null_offset_parent === true &&
    o.document_root === true && o.prefix === true && o.suffix === true &&
    o.expected_gap > o.container_width + 1.5;
}

export function readLegacyFormFieldOutlineBoundaryNative(host) {
  const geometry=readLegacyFormFieldOutlineNative(host);
  if(!geometry||!host)return null;
  return {...geometry,fixed_host:getComputedStyle(host).position==='fixed',null_offset_parent:host.offsetParent===null,
    document_root:host.getRootNode()===document,prefix:!!host.querySelector('.mat-form-field-prefix'),
    suffix:!!host.querySelector('.mat-form-field-suffix')};
}

/** Tagged always-float host class remains true even with no label/placeholder. */
export function legacyFormFieldNoLabelNativeOkay(o) {
  return !!o&&!o.error&&o.historical_host===true&&o.has_label===false&&o.can_float===true&&o.should_float===true&&
    o.label_elements===0&&o.input_disabled===true&&o.input_value==='off';
}

export function readLegacyFormFieldNoLabelNative(host) {
  if(!host)return null;
  const input=host.querySelector('input');
  return {historical_host:host.tagName==='MAT-FORM-FIELD'&&host.classList.contains('mat-form-field'),
    has_label:host.classList.contains('mat-form-field-has-label'),can_float:host.classList.contains('mat-form-field-can-float'),
    should_float:host.classList.contains('mat-form-field-should-float'),
    label_elements:host.querySelectorAll('.mat-form-field-label').length,input_disabled:input?.disabled===true,input_value:input?.value};
}
