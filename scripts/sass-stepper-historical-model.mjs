/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
// Proposed pure expected-model helper. Historical CSS must be an authenticated
// Material 16 Stepper member capsule supplied by the caller's frozen contract.
export function historicalStepperPeerCss(peerCss, historicalCss, line, hasColor) {
  if (!['main','21.x'].includes(line) || typeof peerCss !== 'string' ||
      typeof historicalCss !== 'string' || typeof hasColor !== 'boolean') return null;
  // The main ordinary companion uses its measured current peer unchanged.
  if (line === 'main') return peerCss;
  const names = ['header-focus-state-layer-shape','header-hover-state-layer-shape'];
  if (hasColor) names.push('header-hover-state-layer-color','header-focus-state-layer-color',
    'header-error-state-label-text-color','header-error-state-icon-foreground-color');
  let result = peerCss;
  for (const name of names) {
    const property = `--mat-stepper-${name}`;
    const pattern = new RegExp(`^  ${property}: ([^;\\n]+);$`,'gm');
    const peerMatches = [...result.matchAll(pattern)];
    if (peerMatches.length !== 1) return null;
    let historical = '0';
    if (!name.endsWith('-shape')) {
      const originalMatches = [...historicalCss.matchAll(pattern)];
      if (originalMatches.length !== 1) return null;
      historical = originalMatches[0][1];
    }
    result = result.replace(pattern,`  ${property}: ${historical};`);
  }
  return result;
}
