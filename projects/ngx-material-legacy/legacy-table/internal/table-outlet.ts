/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {CdkTable} from '@angular/cdk/table';
import {Directive, ElementRef, Input, OnInit, ViewContainerRef} from '@angular/core';

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
