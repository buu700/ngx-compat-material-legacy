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
  Inject,
  NgZone,
  ViewEncapsulation,
} from '@angular/core';
import {
  MAT_MENU_DEFAULT_OPTIONS,
  MatMenuDefaultOptions,
} from '@angular/material/menu';
import {_MatMenuBase} from './internal/menu-base';
import {MAT_MENU_PANEL} from './internal/menu-panel-token';

/**
 * @docs-public MatMenu
 */
@Component({
  standalone: false,
  selector: 'mat-menu',
  templateUrl: 'menu.html',
  styleUrls: ['menu.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  exportAs: 'matMenu',
  host: {
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    'ngSkipHydration': '',
    // This binding is used to ensure that the component ID doesn't clash with the `MatMenu`.
    '[attr.mat-id-collision]': 'null',
  },
  providers: [{provide: MAT_MENU_PANEL, useExisting: MatLegacyMenu}],
})
export class MatLegacyMenu extends _MatMenuBase {
  protected override _elevationPrefix = 'mat-elevation-z';
  protected override _baseElevation = 4;

  /**
   * @deprecated `changeDetectorRef` parameter will become a required parameter.
   * @breaking-change 15.0.0
   */
  constructor(
    elementRef: ElementRef<HTMLElement>,
    ngZone: NgZone,
    defaultOptions: MatMenuDefaultOptions,
  );

  constructor(
    elementRef: ElementRef<HTMLElement>,
    ngZone: NgZone,
    @Inject(MAT_MENU_DEFAULT_OPTIONS) defaultOptions: MatMenuDefaultOptions,
    changeDetectorRef?: ChangeDetectorRef,
  ) {
    super(elementRef, ngZone, defaultOptions, changeDetectorRef);
  }
}
