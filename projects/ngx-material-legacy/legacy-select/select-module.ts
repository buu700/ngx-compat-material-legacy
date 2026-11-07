/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {OverlayModule} from '@angular/cdk/overlay';
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatLegacyCommonModule as MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';
import {MatLegacyOptionModule} from '@ngx-compat/material-legacy/legacy-core';
import {MatLegacyFormFieldModule} from '@ngx-compat/material-legacy/legacy-form-field';
import {CdkScrollableModule} from '@angular/cdk/scrolling';
import {MAT_SELECT_SCROLL_STRATEGY_PROVIDER} from './internal/select-base';
import {MatLegacySelect, MatLegacySelectTrigger} from './select';


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
