/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  CdkColumnDef,
  CdkFooterRowDef,
  CdkHeaderRowDef,
  CdkRowDef,
  CdkTable,
} from '@angular/cdk/table';
import {Directive, ElementRef, Inject, Input, OnInit, Optional, Self, ViewContainerRef} from '@angular/core';
import {MatLegacyTable} from '../table';

/** Supplies the parent's public outlet protocol without a peer-private token. */
@Directive({standalone: false, selector: '[legacyTableOutlet]'})
export class _LegacyTableOutlet implements OnInit {
  @Input('legacyTableOutlet') kind!: 'header' | 'data' | 'footer' | 'empty';

  constructor(
    private readonly table: CdkTable<unknown>,
    public readonly viewContainer: ViewContainerRef,
    public readonly elementRef: ElementRef,
  ) {}

  ngOnInit(): void {
    switch (this.kind) {
      case 'header': this.table._headerRowOutlet = this; break;
      case 'data': this.table._rowOutlet = this; break;
      case 'footer': this.table._footerRowOutlet = this; break;
      case 'empty': this.table._noDataRowOutlet = this; break;
      default: throw new Error('Unknown legacy table outlet.');
    }
    this.table._outletAssigned();
  }
}

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
