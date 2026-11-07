/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';
import {MatLegacyProgressSpinner} from './progress-spinner';


@NgModule({
  imports: [MatCommonModule, CommonModule],
  exports: [MatLegacyProgressSpinner, MatCommonModule],
  declarations: [MatLegacyProgressSpinner],
})
export class MatLegacyProgressSpinnerModule {}
