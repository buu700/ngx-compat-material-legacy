/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ComponentHarness, HarnessPredicate} from '@angular/cdk/testing';
import {LegacyOptionHarnessFilters} from './option-harness-filters';

/**
 * Harness for interacting with a legacy `mat-option` in tests.
 * @deprecated Use `MatOptionHarness` from `@angular/material/core/testing` instead.
 * @breaking-change 17.0.0
 */
export class MatLegacyOptionHarness extends ComponentHarness {
  static hostSelector = '.mat-option';

  private _text = this.locatorFor('.mat-option-text');

  static with(options: LegacyOptionHarnessFilters = {}) {
    return new HarnessPredicate(MatLegacyOptionHarness, options)
      .addOption('text', options.text, async (harness, title) =>
        HarnessPredicate.stringMatches(await harness.getText(), title),
      )
      .addOption(
        'isSelected',
        options.isSelected,
        async (harness, isSelected) => (await harness.isSelected()) === isSelected,
      );
  }

  async click(): Promise<void> {
    return (await this.host()).click();
  }

  async getText(): Promise<string> {
    return (await this._text()).text();
  }

  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('mat-option-disabled');
  }

  async isSelected(): Promise<boolean> {
    return (await this.host()).hasClass('mat-selected');
  }

  async isActive(): Promise<boolean> {
    return (await this.host()).hasClass('mat-active');
  }

  async isMultiple(): Promise<boolean> {
    return (await this.host()).hasClass('mat-option-multiple');
  }
}
