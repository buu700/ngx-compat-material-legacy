/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {MatLegacyMenu} from './menu';
export {MatLegacyMenuItem} from './menu-item';
export {MatLegacyMenuTrigger} from './menu-trigger';
export {MatLegacyMenuModule} from './menu-module';
export {MatLegacyMenuContent} from './menu-content';
// Historical AnimationTriggerMetadata recipes moved to
// `@ngx-compat/material-legacy/legacy-menu/animations`.
export {_MatMenuBase as _MatLegacyMenuBase} from './internal/menu-base';
export {_MatMenuTriggerBase as _MatLegacyMenuTriggerBase} from './internal/menu-trigger-base';
export {_MatMenuContentBase as _MatLegacyMenuContentBase} from './internal/menu-content-base';
export {
  MAT_MENU_SCROLL_STRATEGY_FACTORY as MAT_LEGACY_MENU_SCROLL_STRATEGY_FACTORY,
  MAT_MENU_SCROLL_STRATEGY_FACTORY_PROVIDER as MAT_LEGACY_MENU_SCROLL_STRATEGY_FACTORY_PROVIDER,
  MENU_PANEL_TOP_PADDING as LEGACY_MENU_PANEL_TOP_PADDING,
} from './internal/menu-trigger-base';
export {
  /**
   * @deprecated Use `MAT_MENU_DEFAULT_OPTIONS` from `@angular/material/menu` instead.
   * @breaking-change 17.0.0
   */
  MAT_MENU_DEFAULT_OPTIONS as MAT_LEGACY_MENU_DEFAULT_OPTIONS,

  /**
   * @deprecated Use `MAT_MENU_PANEL` from `@angular/material/menu` instead.
   * @breaking-change 17.0.0
   */
  MAT_MENU_PANEL as MAT_LEGACY_MENU_PANEL,

  /**
   * @deprecated Use `MAT_MENU_SCROLL_STRATEGY` from `@angular/material/menu` instead.
   * @breaking-change 17.0.0
   */
  MAT_MENU_SCROLL_STRATEGY as MAT_LEGACY_MENU_SCROLL_STRATEGY,

  /**
   * @deprecated Use `MatMenuDefaultOptions` from `@angular/material/menu` instead.
   * @breaking-change 17.0.0
   */
  MatMenuDefaultOptions as MatLegacyMenuDefaultOptions,

  /**
   * @deprecated Use `MatMenuPanel` from `@angular/material/menu` instead.
   * @breaking-change 17.0.0
   */
  MatMenuPanel as MatLegacyMenuPanel,

  /**
   * @deprecated Use `MenuPositionX` from `@angular/material/menu` instead.
   * @breaking-change 17.0.0
   */
  MenuPositionX as LegacyMenuPositionX,

  /**
   * @deprecated Use `MenuPositionY` from `@angular/material/menu` instead.
   * @breaking-change 17.0.0
   */
  MenuPositionY as LegacyMenuPositionY,

  /**
   * @deprecated Use `MAT_MENU_CONTENT` from `@angular/material/menu` instead.
   * @breaking-change 17.0.0
   */
  MAT_MENU_CONTENT as MAT_LEGACY_MENU_CONTENT,
} from '@angular/material/menu';
export {MatCommonModule} from './internal/common-module';
