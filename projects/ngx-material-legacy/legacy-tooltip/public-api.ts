/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {MatLegacyTooltipModule} from './tooltip-module';
export {MatLegacyTooltip, LegacyTooltipComponent} from './tooltip';
// Historical AnimationTriggerMetadata recipe moved to
// native CSS motion (historical `/animations` recipe secondary removed in F04).
export {
  _MatTooltipBase as _MatLegacyTooltipBase,
  _TooltipComponentBase as _LegacyTooltipComponentBase,
  MAT_TOOLTIP_SCROLL_STRATEGY_FACTORY as MAT_LEGACY_TOOLTIP_SCROLL_STRATEGY_FACTORY,
  MAT_TOOLTIP_SCROLL_STRATEGY_FACTORY_PROVIDER as MAT_LEGACY_TOOLTIP_SCROLL_STRATEGY_FACTORY_PROVIDER,
  MAT_TOOLTIP_DEFAULT_OPTIONS_FACTORY as MAT_LEGACY_TOOLTIP_DEFAULT_OPTIONS_FACTORY,
} from './internal/tooltip-base';
export {

  TooltipPosition as LegacyTooltipPosition,


  TooltipTouchGestures as LegacyTooltipTouchGestures,


  TooltipVisibility as LegacyTooltipVisibility,


  SCROLL_THROTTLE_MS as LEGACY_SCROLL_THROTTLE_MS,


  MAT_TOOLTIP_SCROLL_STRATEGY as MAT_LEGACY_TOOLTIP_SCROLL_STRATEGY,


  MatTooltipDefaultOptions as MatLegacyTooltipDefaultOptions,


  MAT_TOOLTIP_DEFAULT_OPTIONS as MAT_LEGACY_TOOLTIP_DEFAULT_OPTIONS,
} from '@angular/material/tooltip';

export {

  getMatTooltipInvalidPositionError as getMatLegacyTooltipInvalidPositionError,
} from './owned-errors';
