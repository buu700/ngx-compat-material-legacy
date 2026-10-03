/**
 * Owned shadow-root helpers for legacy controls.
 * These do not import underscore members from `@angular/cdk/platform`.
 */

let shadowDomIsSupported: boolean | undefined;

/** Whether this document can attach a shadow root. */
export function supportsShadowDom(): boolean {
  if (shadowDomIsSupported == null) {
    const head = typeof document !== "undefined" ? document.head : null;
    shadowDomIsSupported = !!(
      head &&
      ((head as HTMLElement & {createShadowRoot?: unknown}).createShadowRoot || head.attachShadow)
    );
  }
  return shadowDomIsSupported;
}

/** Shadow root containing `element`, or null when it is in the light DOM. */
export function getShadowRoot(element: HTMLElement): ShadowRoot | null {
  if (!supportsShadowDom()) {
    return null;
  }
  const rootNode = element.getRootNode ? element.getRootNode() : null;
  if (typeof ShadowRoot !== "undefined" && rootNode instanceof ShadowRoot) {
    return rootNode;
  }
  return null;
}

/** Document focus, walking into open shadow roots. */
export function focusedElementPierceShadowDom(): HTMLElement | null {
  let active =
    typeof document !== "undefined" && document
      ? (document.activeElement as HTMLElement | null)
      : null;
  while (active && active.shadowRoot) {
    const next = active.shadowRoot.activeElement as HTMLElement | null;
    if (!next || next === active) {
      break;
    }
    active = next;
  }
  return active;
}
