/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned finite row harness base (S06) using public CDK harness APIs.
 */

import {
  ComponentHarness,
  ComponentHarnessConstructor,
  HarnessPredicate,
  parallel,
} from '@angular/cdk/testing';
import {CellHarnessFilters} from '@angular/material/table/testing';
import {_MatLegacyCellHarnessBase} from './cell-harness-base';

/** Text extracted from a table row organized by columns. */
export interface MatLegacyRowHarnessColumnsText {
  [columnName: string]: string;
}

/** Owned base for legacy table row harnesses. */
export abstract class _MatLegacyRowHarnessBase<
  CellType extends ComponentHarnessConstructor<Cell> & {
    with: (options?: CellHarnessFilters) => HarnessPredicate<Cell>;
  },
  Cell extends _MatLegacyCellHarnessBase,
> extends ComponentHarness {
  protected abstract _cellHarness: CellType;

  /** Gets a list of cell harnesses for all cells in the row. */
  async getCells(filter: CellHarnessFilters = {}): Promise<Cell[]> {
    return this.locatorForAll(this._cellHarness.with(filter))();
  }

  /** Gets the text of the cells in the row. */
  async getCellTextByIndex(filter: CellHarnessFilters = {}): Promise<string[]> {
    const cells = await this.getCells(filter);
    return parallel(() => cells.map(cell => cell.getText()));
  }

  /** Gets the text inside the row organized by columns. */
  async getCellTextByColumnName(): Promise<MatLegacyRowHarnessColumnsText> {
    const output: MatLegacyRowHarnessColumnsText = {};
    const cells = await this.getCells();
    const cellsData = await parallel(() =>
      cells.map(cell => {
        return parallel(() => [cell.getColumnName(), cell.getText()]);
      }),
    );
    cellsData.forEach(([columnName, text]) => (output[columnName] = text));
    return output;
  }
}
