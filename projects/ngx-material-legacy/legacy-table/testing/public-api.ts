/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
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

  _MatTableHarnessBase as _MatLegacyTableHarnessBase,
} from './table-harness-base';
export {_MatLegacyCellHarnessBase} from './internal/cell-harness-base';
export {
  _MatLegacyRowHarnessBase,
  MatLegacyRowHarnessColumnsText,
} from './internal/row-harness-base';
export type {

  CellHarnessFilters as LegacyCellHarnessFilters,


  RowHarnessFilters as LegacyRowHarnessFilters,


  TableHarnessFilters as LegacyTableHarnessFilters,


  MatTableHarnessColumnsText as MatLegacyTableHarnessColumnsText,
} from '@angular/material/table/testing';
