/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {HarnessPredicate} from '@angular/cdk/testing';
import {RowHarnessFilters} from '@angular/material/table/testing';
import {
  MatLegacyCellHarness,
  MatLegacyFooterCellHarness,
  MatLegacyHeaderCellHarness,
} from './cell-harness';
import {_MatLegacyRowHarnessBase} from './internal/row-harness-base';

/**
 * Harness for interacting with a standard Angular Material table row.
 * @deprecated Use `MatRowHarness` from `@angular/material/table/testing` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
export class MatLegacyRowHarness extends _MatLegacyRowHarnessBase<
  typeof MatLegacyCellHarness,
  MatLegacyCellHarness
> {
  static hostSelector = '.mat-row';
  protected _cellHarness = MatLegacyCellHarness;

  static with(options: RowHarnessFilters = {}): HarnessPredicate<MatLegacyRowHarness> {
    return new HarnessPredicate(MatLegacyRowHarness, options);
  }
}

/**
 * Harness for interacting with a standard Angular Material table header row.
 * @deprecated Use `MatHeaderRowHarness` from `@angular/material/table/testing` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
export class MatLegacyHeaderRowHarness extends _MatLegacyRowHarnessBase<
  typeof MatLegacyHeaderCellHarness,
  MatLegacyHeaderCellHarness
> {
  static hostSelector = '.mat-header-row';
  protected _cellHarness = MatLegacyHeaderCellHarness;

  static with(options: RowHarnessFilters = {}): HarnessPredicate<MatLegacyHeaderRowHarness> {
    return new HarnessPredicate(MatLegacyHeaderRowHarness, options);
  }
}

/**
 * Harness for interacting with a standard Angular Material table footer row.
 * @deprecated Use `MatFooterRowHarness` from `@angular/material/table/testing` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
export class MatLegacyFooterRowHarness extends _MatLegacyRowHarnessBase<
  typeof MatLegacyFooterCellHarness,
  MatLegacyFooterCellHarness
> {
  static hostSelector = '.mat-footer-row';
  protected _cellHarness = MatLegacyFooterCellHarness;

  static with(options: RowHarnessFilters = {}): HarnessPredicate<MatLegacyFooterRowHarness> {
    return new HarnessPredicate(MatLegacyFooterRowHarness, options);
  }
}
