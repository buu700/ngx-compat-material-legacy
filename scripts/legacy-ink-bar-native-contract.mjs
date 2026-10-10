/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact historical offset positioner in the real packed tab group. No matrix fan-out. */
export function legacyInkBarNativeOkay(o) {
  return !!o && !o.error && o.ink_count === 1 && o.selected_count === 1 &&
    o.historical_element === true && o.visible === true &&
    Number.isInteger(o.selected_index) && o.selected_index >= 0 &&
    Number.isFinite(o.left) && Number.isFinite(o.width) &&
    Number.isFinite(o.expected_left) && Number.isFinite(o.expected_width) &&
    o.expected_width > 0 && o.width === o.expected_width && o.left === o.expected_left;
}

export async function observeLegacyInkBarNative({evaluate}) {
  try {
    return await evaluate(`(${readLegacyInkBarNative.toString()})(document.getElementById('tabs'))`);
  } catch (error) { return {error: String(error.message || error)}; }
}

export function readLegacyInkBarNative(root) {
  const inks = root?.querySelectorAll('mat-ink-bar.mat-ink-bar');
  const selected = root?.querySelectorAll('.mat-tab-label.mat-tab-label-active');
  const ink = inks?.[0], label = selected?.[0];
  if (!ink || !label) return {ink_count: inks?.length || 0, selected_count: selected?.length || 0};
  return {ink_count: inks.length, selected_count: selected.length,
    historical_element: ink.tagName === 'MAT-INK-BAR' && ink.classList.contains('mat-ink-bar'),
    selected_index: Array.from(root.querySelectorAll('.mat-tab-label')).indexOf(label),
    visible: getComputedStyle(ink).visibility === 'visible',
    left: parseFloat(ink.style.left), width: parseFloat(ink.style.width),
    expected_left: label.offsetLeft || 0, expected_width: label.offsetWidth || 0};
}

export function legacyInkBarSelectionSequenceOkay(sequence) {
  return Array.isArray(sequence) && sequence.length === 3 && sequence.every(legacyInkBarNativeOkay) &&
    sequence[0].selected_index === 0 && sequence[1].selected_index === 1 && sequence[2].selected_index === 0 &&
    sequence[0].left !== sequence[1].left && sequence[0].left === sequence[2].left;
}
