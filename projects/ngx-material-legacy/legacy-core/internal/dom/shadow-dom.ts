/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Shadow DOM helpers based on Material/CDK 16.2.14 semantics (S03).
 * Do not import current underscore CDK platform helpers.
 */

let shadowDomIsSupported: boolean | undefined;

/** Checks whether the user's browser supports Shadow DOM. */
export function legacySupportsShadowDom(): boolean {
  if (shadowDomIsSupported == null) {
    const head = typeof document !== 'undefined' ? document.head : null;
    shadowDomIsSupported = !!(head && ((head as any).createShadowRoot || head.attachShadow));
  }
  return shadowDomIsSupported;
}

/**
 * Gets the shadow root of an element, if supported and the element is inside the Shadow DOM.
 * Uses the element's realm (`ownerDocument.defaultView.ShadowRoot`) when reachable rather than
 * an unguarded global `ShadowRoot` constructor.
 */
export function legacyGetShadowRoot(element: HTMLElement): ShadowRoot | null {
  if (!legacySupportsShadowDom()) {
    return null;
  }

  const rootNode = element.getRootNode ? element.getRootNode() : null;
  if (!rootNode) {
    return null;
  }

  const view = element.ownerDocument?.defaultView ?? (typeof window !== 'undefined' ? window : null);
  const ShadowRootCtor = view?.ShadowRoot ?? (typeof ShadowRoot !== 'undefined' ? ShadowRoot : null);

  if (ShadowRootCtor && rootNode instanceof ShadowRootCtor) {
    return rootNode as ShadowRoot;
  }

  return null;
}

/**
 * Gets the target of an event while accounting for Shadow DOM composed paths.
 * Preserves historical empty/missing composedPath fallback to `event.target`.
 */
export function legacyGetEventTarget<T extends EventTarget>(event: Event): T | null {
  if (typeof event.composedPath === 'function') {
    const path = event.composedPath();
    if (path && path.length > 0) {
      return path[0] as T;
    }
  }
  return (event.target as T | null) ?? null;
}
