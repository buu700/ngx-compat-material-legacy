/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Inject,
  InjectionToken,
  Optional,
  ViewEncapsulation,
  ViewChild,
} from '@angular/core';
import {MatLegacySelect} from '@ngx-compat/material-legacy/legacy-select';
import {MatLegacyFormFieldAppearance} from '@ngx-compat/material-legacy/legacy-form-field';
import {MatPaginatorIntl} from '@angular/material/paginator';
import {_MatPaginatorBase} from './internal/paginator-base';

/**
 * Object that can be used to configure the default options for the paginator module.
 */
export interface MatLegacyPaginatorDefaultOptions {
  /** Number of items to display on a page. By default set to 50. */
  pageSize?: number;

  /** The set of provided page size options to display to the user. */
  pageSizeOptions?: number[];

  /** Whether to hide the page size selection UI from the user. */
  hidePageSize?: boolean;

  /** Whether to show the first/last buttons UI to the user. */
  showFirstLastButtons?: boolean;

  /** The default form-field appearance to apply to the page size options selector. */
  formFieldAppearance?: MatLegacyFormFieldAppearance;
}

/**
 * Injection token that can be used to provide the default options for the paginator module.
 */
export const MAT_LEGACY_PAGINATOR_DEFAULT_OPTIONS =
  new InjectionToken<MatLegacyPaginatorDefaultOptions>('MAT_LEGACY_PAGINATOR_DEFAULT_OPTIONS');

/**
 * Component to provide navigation between paged information. Displays the size of the current
 * page, user-selectable options to change that size, what items are being shown, and
 * navigational button to go to the previous or next page.
 */
@Component({
  standalone: false,
  selector: 'mat-paginator',
  exportAs: 'matPaginator',
  templateUrl: 'paginator.html',
  styleUrls: ['paginator.scss'],
  inputs: ['disabled'],
  host: {
    'class': 'mat-paginator',
    'role': 'group',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class MatLegacyPaginator extends _MatPaginatorBase<MatLegacyPaginatorDefaultOptions> {
  /** If set, styles the "page size" form field with the designated style. */
  _formFieldAppearance?: MatLegacyFormFieldAppearance;

  @ViewChild(MatLegacySelect) private _pageSizeSelect?: MatLegacySelect;
  @ViewChild(MatLegacySelect, {read: ElementRef}) private _pageSizeSelectElement?: ElementRef<HTMLElement>;

  /** Extend the page-size pointer target without changing the historical field layout. */
  @HostListener('click', ['$event'])
  protected _handlePageSizeTargetClick(event: MouseEvent): void {
    const select = this._pageSizeSelect;
    const element = this._pageSizeSelectElement?.nativeElement;
    const target = event.target as Element | null;
    if (event.detail <= 0 || event.button !== 0 || this.disabled || this.hidePageSize ||
        !select || select.disabled || select.panelOpen || !element || !target || target.nodeType !== 1) {
      return;
    }

    const container = element.closest('.mat-paginator-page-size');
    // The form-field already forwards these clicks to the select. Preserve that path exactly.
    if (!container || !container.contains(target) || target.closest('.mat-form-field-flex')) {
      return;
    }
    const rect = element.getBoundingClientRect();
    const style = element.ownerDocument.defaultView?.getComputedStyle(element);
    if (!element.getClientRects().length || !rect.width || !rect.height ||
        !style || style.display === 'none' || style.visibility !== 'visible') {
      return;
    }
    const centerY = (rect.top + rect.bottom) / 2;
    // Pointer click coordinates are integer CSS pixels in Chromium even when layout is fractional.
    // Include the pixel cells that intersect the visual rectangle.
    if (event.clientX >= Math.floor(rect.left) && event.clientX < Math.ceil(rect.right) &&
        event.clientY >= Math.floor(centerY - 24) && event.clientY < Math.ceil(centerY + 24)) {
      select.onContainerClick();
    }
  }

  constructor(
    intl: MatPaginatorIntl,
    changeDetectorRef: ChangeDetectorRef,
    @Optional()
    @Inject(MAT_LEGACY_PAGINATOR_DEFAULT_OPTIONS)
    defaults?: MatLegacyPaginatorDefaultOptions,
  ) {
    super(intl, changeDetectorRef, defaults);

    if (defaults && defaults.formFieldAppearance != null) {
      this._formFieldAppearance = defaults.formFieldAppearance;
    }
  }
}
