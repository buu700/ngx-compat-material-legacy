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
export {
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
   * @deprecated Use `MatRowHarnessColumnsText` from `@angular/material/table/testing` instead.
   * @breaking-change 17.0.0
   */
  MatRowHarnessColumnsText as MatLegacyRowHarnessColumnsText,

  /**
   * @deprecated Use `MatTableHarnessColumnsText` from `@angular/material/table/testing` instead.
   * @breaking-change 17.0.0
   */
  MatTableHarnessColumnsText as MatLegacyTableHarnessColumnsText,

  /**
   * @deprecated Use `_MatCellHarnessBase` from `@angular/material/table/testing` instead.
   * @breaking-change 17.0.0
   */
  _MatCellHarnessBase as _MatLegacyCellHarnessBase,

  /**
   * @deprecated Use `_MatRowHarnessBase` from `@angular/material/table/testing` instead.
   * @breaking-change 17.0.0
   */
  _MatRowHarnessBase as _MatLegacyRowHarnessBase,
} from '@angular/material/table/testing';
