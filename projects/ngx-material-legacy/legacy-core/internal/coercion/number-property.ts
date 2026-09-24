/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned numeric-recognition helper based on CDK 16.2.14 (S04).
 * Do not import current underscore `_isNumberValue`.
 */

/**
 * Whether the provided value is considered a number for sorting/filtering.
 * Empty strings, whitespace, null, booleans, and mixed suffixes follow historical
 * parseFloat+Number semantics (not truthiness / bare Number()).
 */
export function legacyIsNumberValue(value: unknown): boolean {
  return !isNaN(parseFloat(value as any)) && !isNaN(Number(value));
}
