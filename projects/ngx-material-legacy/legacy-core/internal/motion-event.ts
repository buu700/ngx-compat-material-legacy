/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Copyright (c) 2026 Ryan Lester
 */

/** True when the motion event was dispatched on the listening element. */
export function legacyHostMotionEvent(event: {
  target: EventTarget | null;
  currentTarget: EventTarget | null;
}): boolean {
  return event.target != null && event.target === event.currentTarget;
}

/**
 * Returns the animation name when it has not already completed.
 * The same name completes once until the caller resets the previous name.
 */
export function legacyNextMotionCompletion(
  previous: string | undefined,
  animationName: string,
): string | undefined {
  if (!animationName || previous === animationName) {
    return undefined;
  }
  return animationName;
}
