/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned finite cell harness base (S05) using public CDK harness APIs.
 */

import {
  ComponentHarnessConstructor,
  ContentContainerComponentHarness,
  HarnessPredicate,
} from '@angular/cdk/testing';
import {CellHarnessFilters} from '@angular/material/table/testing';

/** Owned base for legacy table cell harnesses. */
export abstract class _MatLegacyCellHarnessBase extends ContentContainerComponentHarness {
  /** Gets the cell's text. */
  async getText(): Promise<string> {
    return (await this.host()).text();
  }

  /** Gets the name of the column that the cell belongs to. */
  async getColumnName(): Promise<string> {
    const host = await this.host();
    const classAttribute = await host.getAttribute('class');

    if (classAttribute) {
      const prefix = 'mat-column-';
      const name = classAttribute
        .split(' ')
        .map(c => c.trim())
        .find(c => c.startsWith(prefix));

      if (name) {
        return name.split(prefix)[1];
      }
    }

    throw Error('Could not determine column name of cell.');
  }

  protected static _getCellPredicate<T extends _MatLegacyCellHarnessBase>(
    type: ComponentHarnessConstructor<T>,
    options: CellHarnessFilters,
  ): HarnessPredicate<T> {
    return new HarnessPredicate(type, options)
      .addOption('text', options.text, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getText(), text),
      )
      .addOption('columnName', options.columnName, (harness, name) =>
        HarnessPredicate.stringMatches(harness.getColumnName(), name),
      );
  }
}
