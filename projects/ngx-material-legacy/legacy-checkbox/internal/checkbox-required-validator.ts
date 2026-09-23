/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directive, forwardRef, NgModule, Provider} from '@angular/core';
import {CheckboxRequiredValidator, NG_VALIDATORS} from '@angular/forms';

export const MAT_CHECKBOX_REQUIRED_VALIDATOR: Provider = {
  provide: NG_VALIDATORS,
  useExisting: forwardRef(() => MatCheckboxRequiredValidator),
  multi: true,
};

/**
 * Validator for Material checkbox's required attribute in template-driven checkbox.
 */
@Directive({
  standalone: false,
  selector: `mat-checkbox[required][formControlName],
             mat-checkbox[required][formControl], mat-checkbox[required][ngModel]`,
  providers: [MAT_CHECKBOX_REQUIRED_VALIDATOR],
})
export class MatCheckboxRequiredValidator extends CheckboxRequiredValidator {}

@NgModule({
  exports: [MatCheckboxRequiredValidator],
  declarations: [MatCheckboxRequiredValidator],
})
export class _MatCheckboxRequiredValidatorModule {}
