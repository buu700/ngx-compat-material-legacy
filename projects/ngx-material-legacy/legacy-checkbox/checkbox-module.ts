/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ObserversModule} from '@angular/cdk/observers';
import {NgModule} from '@angular/core';
import {MatRippleModule} from '@angular/material/core';
import {MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';
import {MatLegacyCheckbox} from './checkbox';
import {_MatCheckboxRequiredValidatorModule} from './internal/checkbox-required-validator';


@NgModule({
  imports: [MatRippleModule, MatCommonModule, ObserversModule, _MatCheckboxRequiredValidatorModule],
  exports: [MatLegacyCheckbox, MatCommonModule, _MatCheckboxRequiredValidatorModule],
  declarations: [MatLegacyCheckbox],
})
export class MatLegacyCheckboxModule {}
