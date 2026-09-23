/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Duration defaults for legacy dialog open/close (CSS or recipe path).
 * Kept free of `@angular/animations` so the primary dialog entry can omit that peer.
 */

/**
 * Default parameters for the animation for backwards compatibility.
 * @docs-private
 */
export const _defaultParams = {
  params: {enterAnimationDuration: '150ms', exitAnimationDuration: '75ms'},
};

/**
 * Alias used by the legacy dialog container template binding.
 * @docs-private
 * @deprecated Use `_defaultParams` instead.
 * @breaking-change 17.0.0
 */
export const defaultParams = _defaultParams;
