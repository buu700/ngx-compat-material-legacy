/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
  /**
   * @deprecated Use `MAT_SELECT_CONFIG` from `@angular/material/select` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  MAT_SELECT_CONFIG as MAT_LEGACY_SELECT_CONFIG,

  /**
   * @deprecated Use `MAT_SELECT_SCROLL_STRATEGY` from `@angular/material/select` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  MAT_SELECT_SCROLL_STRATEGY as MAT_LEGACY_SELECT_SCROLL_STRATEGY,



  /**
   * @deprecated Use `MAT_SELECT_TRIGGER` from `@angular/material/select` instead. See https://material.angular.io/guide/mdc-migration for information about migrating.
   * @breaking-change 17.0.0
   */
  MAT_SELECT_TRIGGER as MAT_LEGACY_SELECT_TRIGGER,
} from '@angular/material/select';

export {MatCommonModule} from './internal/common-module';

export {
  MAT_SELECT_SCROLL_STRATEGY_PROVIDER as MAT_LEGACY_SELECT_SCROLL_STRATEGY_PROVIDER,
  MAT_SELECT_SCROLL_STRATEGY_PROVIDER_FACTORY as MAT_LEGACY_SELECT_SCROLL_STRATEGY_PROVIDER_FACTORY,
} from './internal/select-base';
