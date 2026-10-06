/**
 * Test-only adapter replacing `@angular/cdk/testing/private`.
 * Adapted from Angular Components 16.2.14
 * `src/cdk/testing/testbed/fake-events` (MIT, Google LLC).
 * Not part of the published package surface.
 */
export {
  createMouseEvent,
  createFakeEvent,
  createKeyboardEvent,
  createPointerEvent,
  createTouchEvent,
} from './event-objects';
export {
  dispatchEvent,
  dispatchFakeEvent,
  dispatchKeyboardEvent,
  dispatchMouseEvent,
  dispatchPointerEvent,
  dispatchTouchEvent,
} from './dispatch-events';
export {patchElementFocus, triggerFocus, triggerBlur} from './element-focus';
export {typeInElement, clearElement} from './type-in-element';
export {MockNgZone} from './mock-ng-zone';
export {wrappedErrorMessage} from './wrapped-error-message';
