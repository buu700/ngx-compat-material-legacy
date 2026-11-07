/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatLegacyCommonModule as MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';
import {MatLegacyButtonModule} from '@ngx-compat/material-legacy/legacy-button';
import {MatLegacySelectModule} from '@ngx-compat/material-legacy/legacy-select';
import {MatLegacyTooltipModule} from '@ngx-compat/material-legacy/legacy-tooltip';
import {MatLegacyPaginator} from './paginator';
import {_MatLegacyPaginatorOptions} from './internal/page-size-options';
import {MAT_PAGINATOR_INTL_PROVIDER} from './internal/paginator-base';


@NgModule({
  imports: [
    CommonModule,
    MatLegacyButtonModule,
    MatLegacySelectModule,
    MatLegacyTooltipModule,
    MatCommonModule,
  ],
  exports: [MatLegacyPaginator],
  declarations: [MatLegacyPaginator, _MatLegacyPaginatorOptions],
  providers: [MAT_PAGINATOR_INTL_PROVIDER],
})
export class MatLegacyPaginatorModule {}
