/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// Projected hints and hintLabel elements share a DOM ID prefix.
let nextHintId = 0;

/** Internal allocator for generated legacy hint IDs. */
export function nextLegacyHintId(): string {
  return `mat-hint-${nextHintId++}`;
}
