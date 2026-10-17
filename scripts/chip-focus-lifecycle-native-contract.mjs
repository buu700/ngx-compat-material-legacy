/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Real packed chip events and DOM focus; supplementary to settled form blur. */
export function chipFocusLifecycleNativeOkay(o) {
  return !!o && o.schema_version === 1 && !o.error &&
    o.initial_native_focus_calls === 1 && o.initial_focus_notifications === 1 &&
    o.initial_notification_has_focus === true && o.initial_notification_dom_matches === true &&
    o.pending_before_has_focus === true && o.pending_before_dom_outside === true &&
    o.pending_native_focus_calls === 1 && o.pending_focus_notifications === 1 &&
    o.pending_notification_has_focus === true && o.pending_notification_dom_matches === true &&
    o.pending_after_has_focus === true && o.pending_after_dom_matches === true &&
    o.settled_has_focus === true && o.settled_dom_matches === true &&
    o.stale_blur_notifications === 0 && o.focus_notifications_after_settling === 2;
}
