/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewEncapsulation,
} from '@angular/core';
import {MatMenuItem as BaseMatMenuItem} from '@angular/material/menu';

/**
 * Single item inside of a `mat-menu`. Provides the menu item styling and accessibility treatment.
 * @deprecated Use `MatMenuItem` from `@angular/material/menu` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
 * @breaking-change 17.0.0
 */
@Component({
  standalone: false,
  selector: '[mat-menu-item]',
  exportAs: 'matMenuItem',
  host: {
    '[attr.role]': 'role',
    '[class.mat-menu-item]': 'true',
    '[class.mat-menu-item-highlighted]': '_highlighted',
    '[class.mat-menu-item-submenu-trigger]': '_triggersSubmenu',
    '[attr.tabindex]': '_getTabIndex()',
    '[attr.aria-disabled]': 'disabled.toString()',
    '[attr.disabled]': 'disabled || null',
    'class': 'mat-focus-indicator',

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
  providers: [{provide: BaseMatMenuItem, useExisting: MatLegacyMenuItem}],
})
export class MatLegacyMenuItem extends BaseMatMenuItem {
  // Re-declare with booleanAttribute so bare `disabled` / `disableRipple`
  // attributes become true (current Material pattern). Plain inputs[] left
  // them as empty strings and broke matRippleDisabled.
  @Input({transform: booleanAttribute})
  override disabled: boolean = false;

  @Input({transform: booleanAttribute})
  override disableRipple: boolean = false;
}
