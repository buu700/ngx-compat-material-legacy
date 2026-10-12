/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {CdkColumnDef} from '@angular/cdk/table';
import {Directive, ElementRef, Inject, Optional} from '@angular/core';

const legacyColumns = new WeakSet<CdkColumnDef>();

/** Register the returned public parent without retaining the definition. */
export function markLegacyColumn(definition: CdkColumnDef): void {
  legacyColumns.add(definition);
}

/** Keep historical column classes without reading the CDK's private class array. */
export function addLegacyColumnClass(definition: CdkColumnDef | null, element: Element): void {
  if (definition && legacyColumns.has(definition)) {
    element.classList.add(`mat-column-${definition.cssClassFriendlyName}`);
  }
}

/** Preserve mixing public CDK cells with historical legacy column definitions. */
@Directive({
  standalone: false,
  selector: 'cdk-cell, td[cdk-cell], cdk-header-cell, th[cdk-header-cell], cdk-footer-cell, td[cdk-footer-cell]',
})
export class _LegacyTableColumnClasses {
  constructor(
    elementRef: ElementRef<Element>,
    @Optional() @Inject(CdkColumnDef) column: CdkColumnDef | null,
  ) {
    addLegacyColumnClass(column, elementRef.nativeElement);
  }
}
