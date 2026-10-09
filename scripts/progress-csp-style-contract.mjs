/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Fixed indigo M2 browser fixture only; no general CSP or motion clearance. */
export function progressCspStyleOkay(probe) {
  if (!probe || probe.error || probe.ie11_media_matches !== false
    || probe.legacy_buffer_inline_svg !== true || probe.historical_data_uri_retained !== true
    || probe.negative_data_image_blocked !== true
    || !Array.isArray(probe.positive_violations) || probe.positive_violations.length !== 0
    || typeof probe.compiled_css_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(probe.compiled_css_sha256)) return false;
  const modes = probe.modes;
  if (!modes || Array.isArray(modes)
    || Object.keys(modes).sort().join(',') !== 'buffer,determinate,indeterminate,query') return false;
  for (const mode of ['determinate', 'query', 'indeterminate']) {
    const row = modes[mode];
    if (row?.present !== true || row.dots_present !== false
      || row.background_image !== null || row.mask_image !== null || row.background_color !== null) return false;
  }
  const buffer = modes.buffer;
  return buffer?.present === true && buffer.dots_present === true && buffer.mask_image === 'none'
    && buffer.background_color === 'rgba(63, 81, 181, 0.25)'
    && buffer.background_image === 'radial-gradient(circle, rgba(63, 81, 181, 0.25) 2px, rgba(0, 0, 0, 0) 0px)';
}
