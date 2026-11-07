/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export {MatLegacySelectModule} from './select-module';
// Historical `/animations` recipe secondary removed (F04); use CSS/Web Animations via MATERIAL_ANIMATIONS.
export {
  MatLegacySelectChange,
  MatLegacySelect,
  MatLegacySelectTrigger,
  MatLegacySelectConfig,
} from './select';

export {

  MAT_SELECT_CONFIG as MAT_LEGACY_SELECT_CONFIG,


  MAT_SELECT_TRIGGER as MAT_LEGACY_SELECT_TRIGGER,
} from '@angular/material/select';


export {
  MAT_SELECT_SCROLL_STRATEGY as MAT_LEGACY_SELECT_SCROLL_STRATEGY,
  MAT_SELECT_SCROLL_STRATEGY_PROVIDER as MAT_LEGACY_SELECT_SCROLL_STRATEGY_PROVIDER,
  MAT_SELECT_SCROLL_STRATEGY_PROVIDER_FACTORY as MAT_LEGACY_SELECT_SCROLL_STRATEGY_PROVIDER_FACTORY,
} from './internal/select-base';
