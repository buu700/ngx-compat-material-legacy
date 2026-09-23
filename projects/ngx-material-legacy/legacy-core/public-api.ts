/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export * from './option/index';
export {MatCommonModule} from './internal/common-module';

export {
  MATERIAL_ANIMATIONS,
  LEGACY_ANIMATIONS_TEST_OVERRIDE,
  LEGACY_ZERO_ANIMATION_PARAMS,
  getLegacyAnimationsState,
  legacyAnimationsDisabled,
  zeroAnimationParams,
  legacyAnimationTriggerState,
} from './internal/legacy-animations';
export type {LegacyAnimationsState} from './internal/legacy-animations';
