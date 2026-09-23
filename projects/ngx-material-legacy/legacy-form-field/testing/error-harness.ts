/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  ComponentHarness,
  ComponentHarnessConstructor,
  HarnessPredicate,
} from '@angular/cdk/testing';
import {ErrorHarnessFilters} from '@angular/material/form-field/testing';

/**
 * Harness for interacting with a legacy `mat-error` in tests.
 * @deprecated Use `MatErrorHarness` from `@angular/material/form-field/testing` instead.
 * @breaking-change 17.0.0
 */
export class MatLegacyErrorHarness extends ComponentHarness {
  static hostSelector = '.mat-error';

  static with<T extends MatLegacyErrorHarness>(
    this: ComponentHarnessConstructor<T>,
    options: ErrorHarnessFilters = {},
  ): HarnessPredicate<T> {
    return new HarnessPredicate(this, options).addOption('text', options.text, (harness, text) =>
      HarnessPredicate.stringMatches(harness.getText(), text),
    );
  }

  async getText(): Promise<string> {
    return (await this.host()).text();
  }
}
