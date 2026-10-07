/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directive} from '@angular/core';
import {_MatAutocompleteOriginBase} from './internal/autocomplete-origin-base';

/**
 * Directive applied to an element to make it usable
 * as a connection point for an autocomplete panel.
 */
@Directive({
  standalone: false,
  selector: '[matAutocompleteOrigin]',
  exportAs: 'matAutocompleteOrigin',
})
export class MatLegacyAutocompleteOrigin extends _MatAutocompleteOriginBase {}
