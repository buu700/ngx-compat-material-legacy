/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directive, forwardRef, NgModule, Provider} from '@angular/core';
import {CheckboxRequiredValidator, NG_VALIDATORS} from '@angular/forms';

export const MAT_SLIDE_TOGGLE_REQUIRED_VALIDATOR: Provider = {
  provide: NG_VALIDATORS,
  useExisting: forwardRef(() => MatSlideToggleRequiredValidator),
  multi: true,
};

@Directive({
  standalone: false,
  selector: `mat-slide-toggle[required][formControlName],
             mat-slide-toggle[required][formControl], mat-slide-toggle[required][ngModel]`,
  providers: [MAT_SLIDE_TOGGLE_REQUIRED_VALIDATOR],
})
export class MatSlideToggleRequiredValidator extends CheckboxRequiredValidator {}

@NgModule({
  exports: [MatSlideToggleRequiredValidator],
  declarations: [MatSlideToggleRequiredValidator],
})
export class _MatSlideToggleRequiredValidatorModule {}
