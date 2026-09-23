/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {MatLegacyTableModule} from './table-module';
export {
  MatLegacyCellDef,
  MatLegacyHeaderCellDef,
  MatLegacyFooterCellDef,
  MatLegacyColumnDef,
  MatLegacyHeaderCell,
  MatLegacyFooterCell,
  MatLegacyCell,
} from './cell';
export {MatLegacyRecycleRows, MatLegacyTable} from './table';
export {
  MatLegacyHeaderRowDef,
  MatLegacyFooterRowDef,
  MatLegacyRowDef,
  MatLegacyHeaderRow,
  MatLegacyFooterRow,
  MatLegacyRow,
  MatLegacyNoDataRow,
} from './row';
export {MatLegacyTableDataSource} from './table-data-source';
export {MatLegacyTextColumn} from './text-column';
export {
  /**
   * @deprecated Use modern table data source APIs from `@angular/material/table` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  MatTableDataSourcePageEvent as MatLegacyTableDataSourcePageEvent,

  /**
   * @deprecated Use modern table data source APIs from `@angular/material/table` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  MatTableDataSourcePaginator as MatLegacyTableDataSourcePaginator,

  /**
   * @deprecated Use `MatTableDataSource` from `@angular/material/table` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  _MatTableDataSource as _MatLegacyTableDataSource,
} from './internal/table-data-source-base';
export {MatCommonModule} from './internal/common-module';
