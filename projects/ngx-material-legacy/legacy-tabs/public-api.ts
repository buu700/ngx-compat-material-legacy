/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {MatLegacyTabsModule} from './tabs-module';
export {MatLegacyTab} from './tab';
export {MatLegacyTabGroup} from './tab-group';
export {MatLegacyTabHeader} from './tab-header';
export {MatLegacyTabBody, MatLegacyTabBodyPortal} from './tab-body';
export {MatLegacyTabLabel} from './tab-label';
export {MatLegacyTabLabelWrapper} from './tab-label-wrapper';
export {MatLegacyTabContent} from './tab-content';
export {MatLegacyInkBar} from './ink-bar';
export {MatLegacyTabLink, MatLegacyTabNav, MatLegacyTabNavPanel} from './tab-nav-bar/tab-nav-bar';
// Historical recipes: `@ngx-compat/material-legacy/legacy-tabs/animations`.
export {
  _MatTabBase as _MatLegacyTabBase,
  MAT_TAB_GROUP as MAT_LEGACY_TAB_GROUP,
} from './internal/tab-base';
export {
  _MatTabBodyBase as _MatLegacyTabBodyBase,
  MatTabBodyPositionState as MatLegacyTabBodyPositionState,
  MatTabBodyOriginState as MatLegacyTabBodyOriginState,
} from './internal/tab-body-base';
export {
  _MatTabGroupBase as _MatLegacyTabGroupBase,
  MatTabChangeEvent as MatLegacyTabChangeEvent,
  MatTabGroupBaseHeader as MatLegacyTabGroupBaseHeader,
  MatTabHeaderPosition as MatLegacyTabHeaderPosition,
} from './internal/tab-group-base';
export {_MatTabHeaderBase as _MatLegacyTabHeaderBase} from './internal/tab-header-base';
export {_MatTabLabelWrapperBase as _MatLegacyTabLabelWrapperBase} from './internal/tab-label-wrapper-base';
export {
  _MatTabNavBase as _MatLegacyTabNavBase,
  _MatTabLinkBase as _MatLegacyTabLinkBase,
} from './internal/tab-nav-bar-base';
export {MatPaginatedTabHeader as MatLegacyPaginatedTabHeader} from './internal/paginated-tab-header';
export {
  MAT_TAB as MAT_LEGACY_TAB,
  MAT_TAB_LABEL as MAT_LEGACY_TAB_LABEL,
  MAT_TAB_CONTENT as MAT_LEGACY_TAB_CONTENT,
  MAT_TABS_CONFIG as MAT_LEGACY_TABS_CONFIG,
  MatTabsConfig as MatLegacyTabsConfig,
  _MatInkBarPositioner as _MatLegacyInkBarPositioner,
  _MAT_INK_BAR_POSITIONER as _MAT_LEGACY_INK_BAR_POSITIONER,
} from '@angular/material/tabs';
export {MatCommonModule} from './internal/common-module';
