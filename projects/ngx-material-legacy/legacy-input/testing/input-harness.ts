/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {HarnessPredicate} from '@angular/cdk/testing';
import {InputHarnessFilters, MatInputHarness} from '@angular/material/input/testing';

/** Harness for a legacy native input or textarea. */
export class MatLegacyInputHarness extends MatInputHarness {
  static override hostSelector = MatInputHarness.hostSelector;

  /** Keeps predicates bound to the legacy harness's native-property behavior. */
  static override with(options: InputHarnessFilters = {}): HarnessPredicate<MatLegacyInputHarness> {
    return new HarnessPredicate(MatLegacyInputHarness, options)
      .addOption('value', options.value, (harness, value) =>
        HarnessPredicate.stringMatches(harness.getValue(), value),
      )
      .addOption('placeholder', options.placeholder, (harness, placeholder) =>
        HarnessPredicate.stringMatches(harness.getPlaceholder(), placeholder),
      )
      .addOption('label', options.label, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getLabel(), label),
      );
  }

  /** Reads the native property, as the Material 16 legacy alias did. */
  override async isDisabled(): Promise<boolean> {
    return (await this.host()).getProperty<boolean>('disabled');
  }
}
