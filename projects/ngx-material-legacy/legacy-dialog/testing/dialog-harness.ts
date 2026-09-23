/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {HarnessPredicate} from '@angular/cdk/testing';
import {DialogHarnessFilters} from '@angular/material/dialog/testing';
import {_MatDialogHarnessBase} from './dialog-harness-base';

/**
 * Selectors for different sections of the mat-dialog that can contain user content.
 * @deprecated Use `enum` from `@angular/material/dialog/testing` instead.
 * @breaking-change 17.0.0
 */
export const enum MatLegacyDialogSection {
  TITLE = '.mat-dialog-title',
  CONTENT = '.mat-dialog-content',
  ACTIONS = '.mat-dialog-actions',
}

/**
 * Harness for interacting with a standard `MatDialog` in tests.
 * @deprecated Use `MatDialogHarness` from `@angular/material/dialog/testing` instead.
 * @breaking-change 17.0.0
 */
export class MatLegacyDialogHarness extends _MatDialogHarnessBase {
  static hostSelector = '.mat-dialog-container';

  static with(options: DialogHarnessFilters = {}): HarnessPredicate<MatLegacyDialogHarness> {
    return new HarnessPredicate(MatLegacyDialogHarness, options);
  }

  protected override _title = this.locatorForOptional(MatLegacyDialogSection.TITLE);
  protected override _content = this.locatorForOptional(MatLegacyDialogSection.CONTENT);
  protected override _actions = this.locatorForOptional(MatLegacyDialogSection.ACTIONS);
}
