/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directive} from '@angular/core';
import {MAT_LEGACY_PREFIX as MAT_PREFIX} from './owned-tokens';

/**
 * Prefix to be placed in front of the form field.
 */
@Directive({
  standalone: false,
  selector: '[matPrefix]',
  providers: [{provide: MAT_PREFIX, useExisting: MatLegacyPrefix}],
})
export class MatLegacyPrefix {}
