#!/usr/bin/env node
/**
 * Runtime identity/behavior smoke for F02/F03 legacy-core aliases and owned helpers.
 * Requires a built dist/ngx-material-legacy tree.
 */
import '@angular/compiler';
import {
  LEGACY_VERSION,
  MAT_LEGACY_DATE_LOCALE,
  MAT_LEGACY_RIPPLE_GLOBAL_OPTIONS,
  LegacyErrorStateMatcher,
  MatLegacyNativeDateModule,
  LegacyAnimationCurves,
  LegacyAnimationDurations,
  legacyDefaultRippleAnimationConfig,
  legacyIsNumberValue,
  legacyGetEventTarget,
  MatLegacyPseudoCheckbox,
  MatLegacyPseudoCheckboxModule,
  LegacyRippleRenderer,
  legacySetLines,
} from '../../dist/ngx-material-legacy/fesm2022/ngx-compat-material-legacy-legacy-core.mjs';
import {
  VERSION,
  MAT_DATE_LOCALE,
  MAT_RIPPLE_GLOBAL_OPTIONS,
  ErrorStateMatcher,
  MatNativeDateModule,
} from '@angular/material/core';

const checks = [
  ['LEGACY_VERSION identity', LEGACY_VERSION === VERSION],
  ['MAT_LEGACY_DATE_LOCALE identity', MAT_LEGACY_DATE_LOCALE === MAT_DATE_LOCALE],
  ['MAT_LEGACY_RIPPLE_GLOBAL_OPTIONS identity', MAT_LEGACY_RIPPLE_GLOBAL_OPTIONS === MAT_RIPPLE_GLOBAL_OPTIONS],
  ['LegacyErrorStateMatcher identity', LegacyErrorStateMatcher === ErrorStateMatcher],
  ['MatLegacyNativeDateModule identity', MatLegacyNativeDateModule === MatNativeDateModule],
  ['LegacyAnimationCurves', LegacyAnimationCurves.STANDARD_CURVE.includes('cubic-bezier')],
  ['LegacyAnimationDurations', LegacyAnimationDurations.ENTERING === '225ms'],
  ['legacyDefaultRippleAnimationConfig', legacyDefaultRippleAnimationConfig.enterDuration === 225 && legacyDefaultRippleAnimationConfig.exitDuration === 150],
  ['legacyIsNumberValue(0)', legacyIsNumberValue(0) === true],
  ['legacyIsNumberValue("")', legacyIsNumberValue('') === false],
  ['legacyIsNumberValue("123hello")', legacyIsNumberValue('123hello') === false],
  ['legacyGetEventTarget composed', legacyGetEventTarget({composedPath: () => ['a'], target: 'b'}) === 'a'],
  ['legacyGetEventTarget empty path', legacyGetEventTarget({composedPath: () => [], target: 'b'}) === 'b'],
  ['MatLegacyPseudoCheckbox', typeof MatLegacyPseudoCheckbox === 'function'],
  ['MatLegacyPseudoCheckboxModule', typeof MatLegacyPseudoCheckboxModule === 'function'],
  ['LegacyRippleRenderer', typeof LegacyRippleRenderer === 'function'],
  ['legacySetLines', typeof legacySetLines === 'function'],
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
const report = {ok: failed.length === 0, passed: checks.length - failed.length, failed};
console.log(JSON.stringify(report, null, 2));
process.exit(failed.length ? 1 : 0);
