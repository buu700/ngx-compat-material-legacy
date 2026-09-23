/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {HarnessPredicate} from '@angular/cdk/testing';
import {
  MatLegacyOptionHarness,
  MatLegacyOptgroupHarness,
  LegacyOptionHarnessFilters,
  LegacyOptgroupHarnessFilters,
} from '@ngx-compat/material-legacy/legacy-core/testing';
import {LegacySelectHarnessFilters} from './select-harness-filters';
import {_MatSelectHarnessBase} from './select-harness-base';

/**
 * Harness for interacting with a standard mat-select in tests.
 * @deprecated Use `MatSelectHarness` from `@angular/material/select/testing` instead.
 * @breaking-change 17.0.0
 */
export class MatLegacySelectHarness extends _MatSelectHarnessBase<
  typeof MatLegacyOptionHarness,
  MatLegacyOptionHarness,
  LegacyOptionHarnessFilters,
  typeof MatLegacyOptgroupHarness,
  MatLegacyOptgroupHarness,
  LegacyOptgroupHarnessFilters
> {
  static hostSelector = '.mat-select';
  protected _prefix = 'mat';
  protected _optionClass = MatLegacyOptionHarness;
  protected _optionGroupClass = MatLegacyOptgroupHarness;

  static with(options: LegacySelectHarnessFilters = {}): HarnessPredicate<MatLegacySelectHarness> {
    return new HarnessPredicate(MatLegacySelectHarness, options).addOption(
      'disabled',
      options.disabled,
      async (harness, disabled) => {
        return (await harness.isDisabled()) === disabled;
      },
    );
  }
}
