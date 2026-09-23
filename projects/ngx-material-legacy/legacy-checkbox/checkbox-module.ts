/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ObserversModule} from '@angular/cdk/observers';
import {NgModule} from '@angular/core';
import {MatRippleModule} from '@angular/material/core';
import {MatCommonModule} from './internal/common-module';
import {MatLegacyCheckbox} from './checkbox';
import {_MatCheckboxRequiredValidatorModule} from './internal/checkbox-required-validator';

/**
 * @deprecated Use `MatCheckboxModule` from `@angular/material/checkbox` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
@NgModule({
  imports: [MatRippleModule, MatCommonModule, ObserversModule, _MatCheckboxRequiredValidatorModule],
  exports: [MatLegacyCheckbox, MatCommonModule, _MatCheckboxRequiredValidatorModule],
  declarations: [MatLegacyCheckbox],
})
export class MatLegacyCheckboxModule {}
