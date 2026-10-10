/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Native below/center tooltip fixture, including a message that changes its width. */
export function legacyTooltipNativeOkay(o, message) {
  return !!o && !o.error && o.count === 1 && o.historical_element === true &&
    o.visible === true && o.text === message &&
    ['left','top','width','height','host_center','host_bottom','viewport_width','viewport_height']
      .every(key => Number.isFinite(o[key])) &&
    o.width > 0 && o.height > 0 && o.left >= 0 && o.top >= o.host_bottom &&
    o.top - o.host_bottom <= 32 &&
    o.left + o.width <= o.viewport_width && o.top + o.height <= o.viewport_height &&
    Math.abs(o.left + o.width / 2 - o.host_center) <= 1.5;
}

export function legacyTooltipMessageSequenceOkay(sequence) {
  return Array.isArray(sequence) && sequence.length === 2 &&
    legacyTooltipNativeOkay(sequence[0], 'Hello tip') &&
    legacyTooltipNativeOkay(sequence[1], 'A longer tooltip message for repositioning') &&
    sequence[1].width > sequence[0].width;
}

export async function observeLegacyTooltipNative({evaluate}) {
  try {
    return await evaluate(`(() => {
      const tips = document.querySelectorAll('.mat-tooltip'), tip = tips[0];
      const host = document.getElementById('tip-host');
      if (!tip || !host) return {count: tips.length};
      const r = tip.getBoundingClientRect(), h = host.getBoundingClientRect();
      return {count: tips.length, historical_element: tip.classList.contains('mat-tooltip'),
        visible: getComputedStyle(tip).visibility === 'visible' && getComputedStyle(tip).display !== 'none',
        text: tip.textContent.trim(), left: r.left, top: r.top, width: r.width, height: r.height,
        host_center: h.left + h.width / 2, host_bottom: h.bottom,
        viewport_width: innerWidth, viewport_height: innerHeight};
    })()`);
  } catch (error) {return {error: String(error.message || error)};}
}

export function legacyTooltipAriaLifetimeNativeOkay(observation) {
  return !!observation && !observation.error &&
    ['actual_directive_created', 'host_removed', 'initial_description_absent',
      'pending_cleanup_clear', 'later_request_clear'].every(key => observation[key] === true);
}

export async function observeLegacyTooltipAriaLifetimeNative({evaluate}) {
  try {
    return await evaluate(`(() => {
      const output = document.getElementById('tip-aria-result');
      if (output?.getAttribute('data-complete') !== 'true') return null;
      return JSON.parse(output.textContent);
    })()`);
  } catch (error) {return {error: String(error.message || error)};}
}
