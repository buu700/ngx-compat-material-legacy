/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  CDK_TABLE,
  CdkTable,
  STICKY_POSITIONING_LISTENER,
  HeaderRowOutlet,
  DataRowOutlet,
  NoDataRowOutlet,
  FooterRowOutlet,
} from '@angular/cdk/table';
import {ChangeDetectionStrategy, Component, Directive, ViewEncapsulation} from '@angular/core';

/**
 * Enables the recycle view repeater strategy, which reduces rendering latency. Not compatible with
 * tables that animate rows.
 * @deprecated Use `MatRecycleRows` from `@angular/material/table` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
@Directive({
  standalone: false,
  selector: 'mat-table[recycleRows], table[mat-table][recycleRows]',
})
export class MatLegacyRecycleRows {
  /**
   * @deprecated Recycle rows is a no-op under current CDK; retained for selector compatibility.
   * @breaking-change 17.0.0
   */
}

/**
 * Wrapper for the CdkTable with Material design styles.
 * @deprecated Use `MatTable` from `@angular/material/table` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
@Component({
  standalone: false,
  selector: 'mat-table, table[mat-table]',
  exportAs: 'matTable',
  template: `
    <ng-content select="caption"></ng-content>
    <ng-content select="colgroup, col"></ng-content>

    @if (_isServer) {
      <ng-content></ng-content>
    }

    @if (_isNativeHtmlTable) {
      <thead role="rowgroup">
        <ng-container headerRowOutlet></ng-container>
      </thead>
      <tbody role="rowgroup">
        <ng-container rowOutlet></ng-container>
        <ng-container noDataRowOutlet></ng-container>
      </tbody>
      <tfoot role="rowgroup">
        <ng-container footerRowOutlet></ng-container>
      </tfoot>
    } @else {
      <ng-container headerRowOutlet></ng-container>
      <ng-container rowOutlet></ng-container>
      <ng-container noDataRowOutlet></ng-container>
      <ng-container footerRowOutlet></ng-container>
    }
  `,
  styleUrls: ['table.scss'],
  host: {
    'class': 'mat-table',
    '[class.mat-table-fixed-layout]': 'fixedLayout',
    'ngSkipHydration': '',
  },
  providers: [
    {provide: CdkTable, useExisting: MatLegacyTable},
    {provide: CDK_TABLE, useExisting: MatLegacyTable},
    {provide: STICKY_POSITIONING_LISTENER, useValue: null},
  ],
  encapsulation: ViewEncapsulation.None,
  // See note on CdkTable for explanation on why this uses the default change detection strategy.
  // tslint:disable-next-line:validate-decorators
  changeDetection: ChangeDetectionStrategy.Default,
})
export class MatLegacyTable<T> extends CdkTable<T> {
  /** Overrides the sticky CSS class set by the `CdkTable`. */
  protected override stickyCssClass = 'mat-table-sticky';

  /** Overrides the need to add position: sticky on every sticky cell element in `CdkTable`. */
  protected override needsPositionStickyOnElement = false;
}
