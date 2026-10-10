/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** A 20px trigger must retain historical panel inheritance and 3em option sizing. */
export function legacySelectFontNativeOkay(o) {
  return !!o && !o.error && o.panel_count === 1 && o.option_count === 1 &&
    o.historical_panel === true && o.historical_option === true &&
    o.trigger_font === '20px' && o.pane_inline_font === '20px' &&
    o.panel_font === '20px' && o.option_font === '20px' &&
    Number.isFinite(o.option_height) && Math.abs(o.option_height - 60) <= 1;
}

export async function observeLegacySelectFontNative({evaluate}) {
  try {
    return await evaluate(`(() => {
      const trigger = document.querySelector('#choice .mat-select-trigger');
      const panels = document.querySelectorAll('.cdk-overlay-pane .mat-select-panel'), panel = panels[0];
      const options = panel?.querySelectorAll('.mat-option'), option = options?.[0];
      const pane = panel?.closest('.cdk-overlay-pane');
      if (!trigger || !panel || !option || !pane) return {panel_count: panels.length, option_count: options?.length || 0};
      return {panel_count: panels.length, option_count: options.length,
        historical_panel: panel.classList.contains('mat-select-panel'),
        historical_option: option.tagName === 'MAT-OPTION' && option.classList.contains('mat-option'),
        trigger_font: getComputedStyle(trigger).fontSize, pane_inline_font: pane.style.fontSize,
        panel_font: getComputedStyle(panel).fontSize, option_font: getComputedStyle(option).fontSize,
        option_height: option.getBoundingClientRect().height};
    })()`);
  } catch (error) {return {error: String(error.message || error)};}
}
