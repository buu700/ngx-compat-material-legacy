/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export * from './option/index';
export {MatCommonModule, MatCommonModule as MatLegacyCommonModule} from './internal/common-module';

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

// --- Owned helpers / constants (F02/F03) ---
export {LegacyAnimationCurves, LegacyAnimationDurations} from './internal/animation/animation-constants';
export {
  CanDisable as LegacyCanDisable,
  mixinDisabled as legacyMixinDisabled,
  CanColor as LegacyCanColor,
  mixinColor as legacyMixinColor,
  CanDisableRipple as LegacyCanDisableRipple,
  mixinDisableRipple as legacyMixinDisableRipple,
  HasTabIndex as LegacyHasTabIndex,
  mixinTabIndex as legacyMixinTabIndex,
  CanUpdateErrorState as LegacyCanUpdateErrorState,
  mixinErrorState as legacyMixinErrorState,
  HasInitialized as LegacyHasInitialized,
  mixinInitialized as legacyMixinInitialized,
} from './internal/common-behaviors';
export {MATERIAL_LEGACY_SANITY_CHECKS} from './internal/sanity-checks';
export type {LegacySanityChecks, LegacyGranularSanityChecks} from './internal/sanity-checks';
export type {ThemePalette as LegacyThemePalette} from './internal/common-behaviors/color';
export {legacySetLines} from './internal/line/line';
export {MAT_LEGACY_DATE_LOCALE_FACTORY} from './internal/datetime/date-locale';
export {legacyGetEventTarget, legacyGetShadowRoot, legacySupportsShadowDom} from './internal/dom/shadow-dom';
export {legacyIsNumberValue} from './internal/coercion/number-property';
export {
  MatLegacyPseudoCheckbox,
  MatLegacyPseudoCheckboxModule,
} from './pseudo-checkbox';
export type {MatLegacyPseudoCheckboxState} from './pseudo-checkbox';
export {
  LegacyRippleRenderer,
  legacyDefaultRippleAnimationConfig,
  LegacyRippleState,
  LegacyRippleRef,
} from './ripple';
export type {
  LegacyRippleTarget,
  LegacyRippleConfig,
  LegacyRippleAnimationConfig,
} from './ripple';

// --- Conditional public re-exports (identity preserved) ---
export {
  VERSION as LEGACY_VERSION,
  MAT_DATE_LOCALE as MAT_LEGACY_DATE_LOCALE,
  DateAdapter as LegacyDateAdapter,
  MAT_DATE_FORMATS as MAT_LEGACY_DATE_FORMATS,
  NativeDateAdapter as LegacyNativeDateAdapter,
  MAT_NATIVE_DATE_FORMATS as MAT_LEGACY_NATIVE_DATE_FORMATS,
  NativeDateModule as LegacyNativeDateModule,
  MatNativeDateModule as MatLegacyNativeDateModule,
  ShowOnDirtyErrorStateMatcher as LegacyShowOnDirtyErrorStateMatcher,
  ErrorStateMatcher as LegacyErrorStateMatcher,
  MatLine as MatLegacyLine,
  MatLineModule as MatLegacyLineModule,
  MAT_RIPPLE_GLOBAL_OPTIONS as MAT_LEGACY_RIPPLE_GLOBAL_OPTIONS,
  MatRipple as MatLegacyRipple,
  MatRippleModule as MatLegacyRippleModule,
} from '@angular/material/core';
export type {
  MatDateFormats as MatLegacyDateFormats,
  RippleGlobalOptions as LegacyRippleGlobalOptions,
} from '@angular/material/core';
