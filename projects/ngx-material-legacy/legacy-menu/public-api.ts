/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
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
// native CSS motion (historical `/animations` recipe secondary removed in F04).
export {

  MAT_MENU_DEFAULT_OPTIONS as MAT_LEGACY_MENU_DEFAULT_OPTIONS,


  MAT_MENU_SCROLL_STRATEGY as MAT_LEGACY_MENU_SCROLL_STRATEGY,


  MatMenuDefaultOptions as MatLegacyMenuDefaultOptions,




  MenuPositionX as LegacyMenuPositionX,


  MenuPositionY as LegacyMenuPositionY,


  MAT_MENU_CONTENT as MAT_LEGACY_MENU_CONTENT,
} from '@angular/material/menu';
export type {MatMenuPanel as MatLegacyMenuPanel} from './internal/menu-panel';
export {MAT_MENU_PANEL as MAT_LEGACY_MENU_PANEL} from './internal/menu-panel-token';
