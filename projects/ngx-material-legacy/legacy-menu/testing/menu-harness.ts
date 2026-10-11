/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {HarnessPredicate} from '@angular/cdk/testing';
import {MenuItemHarnessFilters} from '@angular/material/menu/testing';
import {_MatMenuHarnessBase, _MatMenuItemHarnessBase} from './menu-harness-base';
import {LegacyMenuHarnessFilters} from './menu-harness-filters';

/**
 * Harness for interacting with a standard mat-menu in tests.
 */
export class MatLegacyMenuHarness extends _MatMenuHarnessBase<
  typeof MatLegacyMenuItemHarness,
  MatLegacyMenuItemHarness,
  MenuItemHarnessFilters
> {
  static hostSelector = '.mat-menu-trigger';
  protected _itemClass = MatLegacyMenuItemHarness;

  static with(options: LegacyMenuHarnessFilters = {}): HarnessPredicate<MatLegacyMenuHarness> {
    return new HarnessPredicate(MatLegacyMenuHarness, options).addOption(
      'triggerText',
      options.triggerText,
      (harness, text) => HarnessPredicate.stringMatches(harness.getTriggerText(), text),
    );
  }
}

/**
 * Harness for interacting with a standard mat-menu-item in tests.
 */
export class MatLegacyMenuItemHarness extends _MatMenuItemHarnessBase<
  typeof MatLegacyMenuHarness,
  MatLegacyMenuHarness
> {
  static hostSelector = '.mat-menu-item';
  protected _menuClass = MatLegacyMenuHarness;

  static with(options: MenuItemHarnessFilters = {}): HarnessPredicate<MatLegacyMenuItemHarness> {
    return new HarnessPredicate(MatLegacyMenuItemHarness, options)
      .addOption('text', options.text, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getText(), text),
      )
      .addOption(
        'hasSubmenu',
        options.hasSubmenu,
        async (harness, hasSubmenu) => (await harness.hasSubmenu()) === hasSubmenu,
      );
  }
}
