/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {MatLegacyTableModule} from './table-module';
export {_LegacyTableDefinitionOwner} from './internal/definition-owner';
// Angular's partial compiler needs NgModule-exported directives at this entrypoint.
export {_LegacyTableColumnClasses as ɵLegacyTableColumnClasses} from './internal/column-classes';
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

  MatTableDataSourcePageEvent as MatLegacyTableDataSourcePageEvent,


  MatTableDataSourcePaginator as MatLegacyTableDataSourcePaginator,


  _MatTableDataSource as _MatLegacyTableDataSource,
} from './internal/table-data-source-base';
export {MatCommonModule} from '@ngx-compat/material-legacy/legacy-core';
