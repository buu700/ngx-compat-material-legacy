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
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {MatMenuItem as PeerMatMenuItem} from '@angular/material/menu';
import {_LegacyMenuItemBase} from './internal/menu-item-base';

/**
 * Single item inside of a `mat-menu`. Provides the menu item styling and accessibility treatment.
 */
@Component({
  standalone: false,
  selector: '[mat-menu-item]',
  exportAs: 'matMenuItem',
  inputs: ['disabled', 'disableRipple'],
  host: {
    '[attr.role]': 'role',
    '[class.mat-menu-item]': 'true',
    '[class.mat-menu-item-highlighted]': '_highlighted',
    '[class.mat-menu-item-submenu-trigger]': '_triggersSubmenu',
    '[attr.tabindex]': '_getTabIndex()',
    '[attr.aria-disabled]': 'disabled.toString()',
    '[attr.disabled]': 'disabled || null',
    'class': 'mat-focus-indicator',
    '(click)': '_checkDisabled($event)',
    '(mouseenter)': '_handleMouseEnter()',

    // Classes added by the base class that should be removed.
    '[class.mat-mdc-menu-item]': 'false',
    '[class.mat-mdc-focus-indicator]': 'false',
    '[class.mdc-list-item]': 'false',
    '[class.mat-mdc-menu-item-highlighted]': 'false',
    '[class.mat-mdc-menu-item-submenu-trigger]': 'false',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: 'menu-item.html',
  providers: [
    {provide: PeerMatMenuItem, useExisting: MatLegacyMenuItem},
    {provide: _LegacyMenuItemBase, useExisting: MatLegacyMenuItem},
  ],
})
export class MatLegacyMenuItem extends _LegacyMenuItemBase {}
