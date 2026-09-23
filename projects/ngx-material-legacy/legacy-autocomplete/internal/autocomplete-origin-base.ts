/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 `_MatAutocompleteOriginBase` (removed from Angular Material 22).
 */

import {Directive, ElementRef} from '@angular/core';

/** Base class containing all of the functionality for `MatAutocompleteOrigin`. */
@Directive()
export abstract class _MatAutocompleteOriginBase {
  constructor(
    /** Reference to the element on which the directive is applied. */
    public elementRef: ElementRef<HTMLElement>,
  ) {}
}
