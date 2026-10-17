/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Members for the existing packed component fixture, in both native runtimes.
 * Callers supply ViewChild/inject/NgZone/MatLegacyChip public imports and two
 * marked DOM targets. No Angular debug API or substitute component algorithm. */
export function chipFocusLifecycleFixtureMembers() {
  return `
  @ViewChild('focusLifecycleChip') focusLifecycleChip?: MatLegacyChip;
  private focusLifecycleZone = inject(NgZone);

  async runChipFocusLifecycle() {
    const chip = this.focusLifecycleChip;
    const element = document.querySelector<HTMLElement>('[data-chip-focus-lifecycle]');
    const outside = document.querySelector<HTMLElement>('[data-chip-focus-outside]');
    if (!chip || !element || !outside) throw new Error('chip focus lifecycle fixture missing');
    outside.focus();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    if (chip._hasFocus) throw new Error('chip focus lifecycle did not reset');

    const descriptor = Object.getOwnPropertyDescriptor(element, 'focus');
    const originalFocus = element.focus;
    let nativeCalls = 0;
    let blurs = 0;
    const notifications: {has_focus: boolean; dom_matches: boolean}[] = [];
    const focused = chip._onFocus.subscribe(() => notifications.push({
      has_focus: chip._hasFocus, dom_matches: document.activeElement === element,
    }));
    const blurred = chip._onBlur.subscribe(() => blurs++);
    element.focus = (options?: FocusOptions) => {
      nativeCalls++;
      originalFocus.call(element, options);
    };
    try {
      this.focusLifecycleZone.run(() => chip.focus());
      const initial = {
        initial_native_focus_calls: nativeCalls,
        initial_focus_notifications: notifications.length,
        initial_notification_has_focus: notifications[0]?.has_focus,
        initial_notification_dom_matches: notifications[0]?.dom_matches,
      };
      // One actual zone turn keeps the outside blur pending until refocus.
      // No zone stability, component field or event delivery is overridden.
      const pending = this.focusLifecycleZone.run(() => {
        outside.focus();
        const before = {pending_before_has_focus: chip._hasFocus,
          pending_before_dom_outside: document.activeElement === outside};
        const previousEvents = notifications.length;
        nativeCalls = 0;
        chip.focus();
        const notification = notifications[previousEvents];
        return {...before, pending_native_focus_calls: nativeCalls,
          pending_focus_notifications: notifications.length - previousEvents,
          pending_notification_has_focus: notification?.has_focus,
          pending_notification_dom_matches: notification?.dom_matches,
          pending_after_has_focus: chip._hasFocus,
          pending_after_dom_matches: document.activeElement === element};
      });
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      return {schema_version: 1, ...initial, ...pending,
        settled_has_focus: chip._hasFocus,
        settled_dom_matches: document.activeElement === element,
        stale_blur_notifications: blurs,
        focus_notifications_after_settling: notifications.length};
    } finally {
      focused.unsubscribe();
      blurred.unsubscribe();
      if (descriptor) Object.defineProperty(element, 'focus', descriptor);
      else delete (element as Partial<HTMLElement>).focus;
    }
  }
`;
}
