/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directive, Input} from '@angular/core';
import {MAT_ERROR} from '@angular/material/form-field';

let nextUniqueId = 0;

/**
 * Single error message to be shown underneath the form field.
 * @deprecated Use `MatError` from `@angular/material/form-field` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
@Directive({
  standalone: false,
  selector: 'mat-error',
  host: {
    'class': 'mat-error',
    '[attr.id]': 'id',
  },
  providers: [{provide: MAT_ERROR, useExisting: MatLegacyError}],
})
export class MatLegacyError {
  @Input() id: string = `mat-error-${nextUniqueId++}`;
}
