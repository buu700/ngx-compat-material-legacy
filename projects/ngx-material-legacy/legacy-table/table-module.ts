/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {NgModule} from '@angular/core';
import {MatLegacyRecycleRows, MatLegacyTable} from './table';
import {
  CdkTableModule,
  HeaderRowOutlet,
  DataRowOutlet,
  NoDataRowOutlet,
  FooterRowOutlet,
} from '@angular/cdk/table';
import {
  MatLegacyCell,
  MatLegacyCellDef,
  MatLegacyColumnDef,
  MatLegacyFooterCell,
  MatLegacyFooterCellDef,
  MatLegacyHeaderCell,
  MatLegacyHeaderCellDef,
} from './cell';
import {
  MatLegacyFooterRow,
  MatLegacyFooterRowDef,
  MatLegacyHeaderRow,
  MatLegacyHeaderRowDef,
  MatLegacyRow,
  MatLegacyRowDef,
  MatLegacyNoDataRow,
} from './row';
import {MatLegacyTextColumn} from './text-column';
import {MatCommonModule} from './internal/common-module';

const EXPORTED_DECLARATIONS = [
  // Table
  MatLegacyTable,
  MatLegacyRecycleRows,

  // Template defs
  MatLegacyHeaderCellDef,
  MatLegacyHeaderRowDef,
  MatLegacyColumnDef,
  MatLegacyCellDef,
  MatLegacyRowDef,
  MatLegacyFooterCellDef,
  MatLegacyFooterRowDef,

  // Cell directives
  MatLegacyHeaderCell,
  MatLegacyCell,
  MatLegacyFooterCell,

  // Row directives
  MatLegacyHeaderRow,
  MatLegacyRow,
  MatLegacyFooterRow,
  MatLegacyNoDataRow,

  MatLegacyTextColumn,
];


@NgModule({
  imports: [CdkTableModule, MatCommonModule, HeaderRowOutlet, DataRowOutlet, NoDataRowOutlet, FooterRowOutlet],
  exports: [MatCommonModule, EXPORTED_DECLARATIONS],
  declarations: EXPORTED_DECLARATIONS,
})
export class MatLegacyTableModule {}
