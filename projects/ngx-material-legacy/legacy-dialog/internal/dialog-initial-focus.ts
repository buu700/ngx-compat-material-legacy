/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {FocusTrapFactory, InteractivityChecker} from '@angular/cdk/a11y';
import {NgZone, Renderer2} from '@angular/core';
import {MatDialogConfig} from '@angular/material/dialog';

/** Owned initial-focus selection. The enclosing CDK container owns tab trapping. */
export interface LegacyDialogInitialFocusContext {
  element: HTMLElement;
  config: Pick<MatDialogConfig, 'autoFocus'>;
  factory: FocusTrapFactory;
  checker: InteractivityChecker;
  renderer: Renderer2;
  ngZone: NgZone;
  isBrowser: boolean;
}

/** Resolve the active element through open shadow roots without private CDK helpers. */
export function legacyDialogContainsFocus(element: HTMLElement): boolean {
  let active = typeof document !== 'undefined' && document ? document.activeElement : null;
  while (active?.shadowRoot) {
    const next = active.shadowRoot.activeElement;
    if (next === active) {
      break;
    }
    active = next;
  }
  return element === active || !!active && element.contains(active);
}

export function focusLegacyDialogInitially(context: LegacyDialogInitialFocusContext,
    options?: FocusOptions): (() => void) | null {
  if (!context.isBrowser) {
    return null;
  }
  const {element, config, factory, checker, renderer, ngZone} = context;
  switch (config.autoFocus) {
    case false:
    case 'dialog':
      if (!legacyDialogContainsFocus(element)) {
        element.focus(options);
      }
      return null;
    case true:
    case 'first-tabbable': {
      // This temporary selector uses the public initial-element algorithm.
      // Defer anchors: the enclosing container already owns the real tab trap.
      const selection = factory.create(element, true);
      try {
        if (!selection.focusInitialElement(options)) {
          element.focus(options);
        }
      } finally {
        selection.destroy();
      }
      return null;
    }
  }
  const selector = config.autoFocus === 'first-heading'
    ? 'h1, h2, h3, h4, h5, h6, [role="heading"]'
    : config.autoFocus as string;
  const target = element.querySelector<HTMLElement>(selector);
  let cleanup: (() => void) | null = null;
  if (target) {
    if (!checker.isFocusable(target)) {
      target.tabIndex = -1;
      ngZone.runOutsideAngular(() => {
        let restored = false;
        const restore = () => {
          if (restored) {
            return;
          }
          restored = true;
          stopBlur();
          stopMouseDown();
          target.removeAttribute('tabindex');
        };
        const stopBlur = renderer.listen(target, 'blur', restore);
        const stopMouseDown = renderer.listen(target, 'mousedown', restore);
        cleanup = restore;
      });
    }
    target.focus(options);
  }
  return cleanup;
}
