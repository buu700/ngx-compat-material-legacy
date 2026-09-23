/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 `_MatDialogHarnessBase` (removed from Angular Material 22).
 */

import {
  ContentContainerComponentHarness,
  ComponentHarnessConstructor,
  HarnessPredicate,
  TestKey,
} from '@angular/cdk/testing';
import {DialogHarnessFilters} from '@angular/material/dialog/testing';
import {DialogRole} from '@angular/material/dialog';

/** Selectors for different sections of the mat-dialog that can contain user content. */
export const enum MatDialogSection {
  TITLE = '.mat-dialog-title',
  CONTENT = '.mat-dialog-content',
  ACTIONS = '.mat-dialog-actions',
}

/** Base class for the `MatDialogHarness` implementation. */
export class _MatDialogHarnessBase extends ContentContainerComponentHarness<
  MatDialogSection | string
> {
  protected _title = this.locatorForOptional(MatDialogSection.TITLE);
  protected _content = this.locatorForOptional(MatDialogSection.CONTENT);
  protected _actions = this.locatorForOptional(MatDialogSection.ACTIONS);

  /** Gets the id of the dialog. */
  async getId(): Promise<string | null> {
    const id = await (await this.host()).getAttribute('id');
    return id !== '' ? id : null;
  }

  /** Gets the role of the dialog. */
  async getRole(): Promise<DialogRole | null> {
    return (await this.host()).getAttribute('role') as Promise<DialogRole | null>;
  }

  /** Gets the value of the dialog's "aria-label" attribute. */
  async getAriaLabel(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-label');
  }

  /** Gets the value of the dialog's "aria-labelledby" attribute. */
  async getAriaLabelledby(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-labelledby');
  }

  /** Gets the value of the dialog's "aria-describedby" attribute. */
  async getAriaDescribedby(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-describedby');
  }

  /** Closes the dialog by pressing Escape. */
  async close(): Promise<void> {
    await (await this.host()).sendKeys(TestKey.ESCAPE);
  }

  /** Gets the text of the dialog's title section. */
  async getTitleText(): Promise<string> {
    return (await this._title())?.text() ?? '';
  }

  /** Gets the text of the dialog's content section. */
  async getContentText(): Promise<string> {
    return (await this._content())?.text() ?? '';
  }

  /** Gets the text of the dialog's actions section. */
  async getActionsText(): Promise<string> {
    return (await this._actions())?.text() ?? '';
  }
}

/** @docs-private */
export function createDialogHarnessPredicate<T extends _MatDialogHarnessBase>(
  type: ComponentHarnessConstructor<T>,
  options: DialogHarnessFilters = {},
): HarnessPredicate<T> {
  return new HarnessPredicate(type, options);
}
