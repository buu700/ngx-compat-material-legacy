/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {HarnessPredicate} from '@angular/cdk/testing';
import {CellHarnessFilters} from '@angular/material/table/testing';
import {_MatLegacyCellHarnessBase} from './internal/cell-harness-base';

/**
 * Harness for interacting with a standard Angular Material table cell.
 * @deprecated Use `MatCellHarness` from `@angular/material/table/testing` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
export class MatLegacyCellHarness extends _MatLegacyCellHarnessBase {
  static hostSelector = '.mat-cell';

  static with(options: CellHarnessFilters = {}): HarnessPredicate<MatLegacyCellHarness> {
    return _MatLegacyCellHarnessBase._getCellPredicate(this, options);
  }
}

/**
 * Harness for interacting with a standard Angular Material table header cell.
 * @deprecated Use `MatHeaderCellHarness` from `@angular/material/table/testing` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
export class MatLegacyHeaderCellHarness extends _MatLegacyCellHarnessBase {
  static hostSelector = '.mat-header-cell';

  static with(options: CellHarnessFilters = {}): HarnessPredicate<MatLegacyHeaderCellHarness> {
    return _MatLegacyCellHarnessBase._getCellPredicate(this, options);
  }
}

/**
 * Harness for interacting with a standard Angular Material table footer cell.
 * @deprecated Use `MatFooterCellHarness` from `@angular/material/table/testing` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
export class MatLegacyFooterCellHarness extends _MatLegacyCellHarnessBase {
  static hostSelector = '.mat-footer-cell';

  static with(options: CellHarnessFilters = {}): HarnessPredicate<MatLegacyFooterCellHarness> {
    return _MatLegacyCellHarnessBase._getCellPredicate(this, options);
  }
}
