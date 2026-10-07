/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ComponentHarness, HarnessPredicate} from '@angular/cdk/testing';
import {LegacyOptgroupHarnessFilters} from './optgroup-harness-filters';
import {MatLegacyOptionHarness} from './option-harness';
import {LegacyOptionHarnessFilters} from './option-harness-filters';

/**
 * Harness for interacting with a legacy `mat-optgroup` in tests.
 */
export class MatLegacyOptgroupHarness extends ComponentHarness {
  static hostSelector = '.mat-optgroup';
  private _label = this.locatorFor('.mat-optgroup-label');

  static with(options: LegacyOptgroupHarnessFilters = {}) {
    return new HarnessPredicate(MatLegacyOptgroupHarness, options).addOption(
      'labelText',
      options.labelText,
      async (harness, title) => HarnessPredicate.stringMatches(await harness.getLabelText(), title),
    );
  }

  async getLabelText(): Promise<string> {
    return (await this._label()).text();
  }

  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('mat-optgroup-disabled');
  }

  async getOptions(filter: LegacyOptionHarnessFilters = {}): Promise<MatLegacyOptionHarness[]> {
    return this.locatorForAll(MatLegacyOptionHarness.with(filter))();
  }
}
