/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  assertInInjectionContext,
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {MatMenuItem as BaseMatMenuItem} from '@angular/material/menu';
import {constructLegacyMenuItem} from './internal/menu-item-context';

/**
 * Single item inside of a `mat-menu`. Provides the menu item styling and accessibility treatment.
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
  /** Construct through Angular DI; the current public parent supplies input transforms. */
  // An ES derived constructor may return an object without calling super. The helper
  // executes the genuine parent once with new.target; this class must have no fields.
  // TypeScript currently requires a syntactic super call even for that valid ES case.
  // @ts-expect-error TS2377: the returned genuine parent instance initializes this.
  constructor() {
    if (arguments.length) {
      throw new Error('MatLegacyMenuItem requires Angular DI; manual dependency arguments are not supported.');
    }
    assertInInjectionContext(MatLegacyMenuItem);
    return constructLegacyMenuItem(new.target);
  }
}
