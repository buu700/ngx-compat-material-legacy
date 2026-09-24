/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {MatLegacyTableHarness} from './table-harness';
export {
  MatLegacyRowHarness,
  MatLegacyHeaderRowHarness,
  MatLegacyFooterRowHarness,
} from './row-harness';
export {
  MatLegacyCellHarness,
  MatLegacyHeaderCellHarness,
  MatLegacyFooterCellHarness,
} from './cell-harness';
export {
  /**
   * @deprecated Use `_MatTableHarnessBase` from `@angular/material/table/testing` instead.
   * @breaking-change 17.0.0
   */
  _MatTableHarnessBase as _MatLegacyTableHarnessBase,
} from './table-harness-base';
export {_MatLegacyCellHarnessBase} from './internal/cell-harness-base';
export {
  _MatLegacyRowHarnessBase,
  MatLegacyRowHarnessColumnsText,
} from './internal/row-harness-base';
export type {
  /**
   * @deprecated Use `CellHarnessFilters` from `@angular/material/table/testing` instead.
   * @breaking-change 17.0.0
   */
  CellHarnessFilters as LegacyCellHarnessFilters,

  /**
   * @deprecated Use `RowHarnessFilters` from `@angular/material/table/testing` instead.
   * @breaking-change 17.0.0
   */
  RowHarnessFilters as LegacyRowHarnessFilters,

  /**
   * @deprecated Use `TableHarnessFilters` from `@angular/material/table/testing` instead.
   * @breaking-change 17.0.0
   */
  TableHarnessFilters as LegacyTableHarnessFilters,

  /**
   * @deprecated Use `MatTableHarnessColumnsText` from `@angular/material/table/testing` instead.
   * @breaking-change 17.0.0
   */
  MatTableHarnessColumnsText as MatLegacyTableHarnessColumnsText,
} from '@angular/material/table/testing';
