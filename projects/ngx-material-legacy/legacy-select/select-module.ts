/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {OverlayModule} from '@angular/cdk/overlay';
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatCommonModule} from './internal/common-module';
import {MatLegacyOptionModule} from '@ngx-compat/material-legacy/legacy-core';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {CdkScrollableModule} from '@angular/cdk/scrolling';
import {MAT_SELECT_SCROLL_STRATEGY_PROVIDER} from './internal/select-base';
import {MatLegacySelect, MatLegacySelectTrigger} from './select';

/**
 * @deprecated Use `MatSelectModule` from `@angular/material/select` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
@NgModule({
  imports: [CommonModule, OverlayModule, MatLegacyOptionModule, MatCommonModule],
  exports: [
    CdkScrollableModule,
    MatLegacyFormFieldModule,
    MatLegacySelect,
    MatLegacySelectTrigger,
    MatLegacyOptionModule,
    MatCommonModule,
  ],
  declarations: [MatLegacySelect, MatLegacySelectTrigger],
  providers: [MAT_SELECT_SCROLL_STRATEGY_PROVIDER],
})
export class MatLegacySelectModule {}
