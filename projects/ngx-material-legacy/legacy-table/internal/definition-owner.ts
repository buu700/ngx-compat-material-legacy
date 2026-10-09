/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {CdkColumnDef, CdkFooterRowDef, CdkHeaderRowDef, CdkRowDef, CdkTable} from '@angular/cdk/table';
import {Directive, Inject, Optional, Self} from '@angular/core';
import {MatLegacyTable} from '../table';

/**
 * Raw public CDK definitions can also be used in a legacy table. Bind them to
 * the nearest public table so nested tables cannot borrow each other's defs.
 * Current tables retain their own provider and are left to the peer.
 */
@Directive({
  standalone: false,
  selector: '[cdkColumnDef], [cdkHeaderRowDef], [cdkFooterRowDef], [cdkRowDef]',
})
export class _LegacyTableDefinitionOwner {
  constructor(
    @Optional() @Inject(CdkTable) table: CdkTable<unknown> | null,
    @Optional() @Self() @Inject(CdkColumnDef) column: CdkColumnDef | null,
    @Optional() @Self() @Inject(CdkHeaderRowDef) header: CdkHeaderRowDef | null,
    @Optional() @Self() @Inject(CdkFooterRowDef) footer: CdkFooterRowDef | null,
    @Optional() @Self() @Inject(CdkRowDef) row: CdkRowDef<unknown> | null,
  ) {
    if (table instanceof MatLegacyTable) {
      for (const definition of [column, header, footer, row]) {
        if (definition) definition._table = table;
      }
    }
  }
}
