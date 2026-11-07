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
import type {LegacyDialogRuntimeConfig as MatDialogConfig} from '../dialog-config';

/** Owned initial-focus selection. The owned container holds the persistent public focus trap. */
export interface LegacyDialogInitialFocusContext {
  element: HTMLElement;
  config: Pick<MatDialogConfig, 'autoFocus'>;
  factory: FocusTrapFactory;
  checker: InteractivityChecker;
  renderer: Pick<Renderer2, 'listen'>;
  ngZone: NgZone;
  isBrowser: boolean;
  isDestroyed: () => boolean;
  onFocusSettled: () => void;
  beforeFallbackFocus?: () => void;
}

/** Resolve the active element through open shadow roots without private CDK helpers. */
export function legacyDialogActiveElement(): HTMLElement | null {
  let active = typeof document !== 'undefined' && document ? document.activeElement : null;
  while (active?.shadowRoot) {
    const next = active.shadowRoot.activeElement;
    if (next === active) {
      break;
    }
    active = next;
  }
  return active as HTMLElement | null;
}

export function legacyDialogContainsFocus(element: HTMLElement): boolean {
  const active = legacyDialogActiveElement();
  return element === active || !!active && element.contains(active);
}

/** Check each visible focus host so that a focused open shadow tree within the dialog is contained. */
export function legacyDialogContainsComposedFocus(element: HTMLElement): boolean {
  let active = typeof document !== 'undefined' && document ? document.activeElement : null;
  while (active) {
    if (element === active || element.contains(active)) {
      return true;
    }
    const next = active.shadowRoot?.activeElement;
    if (!next || next === active) {
      return false;
    }
    active = next;
  }
  return false;
}

export function focusLegacyDialogInitially(context: LegacyDialogInitialFocusContext,
    options?: FocusOptions): (() => void) | null {
  if (!context.isBrowser) {
    context.onFocusSettled();
    return null;
  }
  const {element, config, factory, checker, renderer, ngZone} = context;
  switch (config.autoFocus) {
    case false:
    case 'dialog':
      if (!legacyDialogContainsFocus(element)) {
        element.focus(options);
      }
      context.onFocusSettled();
      return null;
    case true:
    case 'first-tabbable': {
      // This temporary selector uses the public initial-element algorithm.
      // Defer anchors: the enclosing container already owns the real tab trap.
      const selection = factory.create(element, true);
      let focused: boolean;
      try {
        focused = selection.focusInitialElement(options);
      } finally {
        selection.destroy();
      }
      if (focused) {
        context.onFocusSettled();
        return null;
      }
      // The original focusInitialElementWhenReady promise deferred only its fallback.
      let canceled = false;
      Promise.resolve().then(() => {
        if (!canceled && !context.isDestroyed()) {
          context.beforeFallbackFocus?.();
          element.focus(options);
          context.onFocusSettled();
        }
      });
      return () => { canceled = true; };
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
  context.onFocusSettled();
  return cleanup;
}
