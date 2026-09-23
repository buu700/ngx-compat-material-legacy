/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned legacy motion helper. Reads the public MATERIAL_ANIMATIONS token and
 * public ANIMATION_MODULE_TYPE. Does not call private Material helpers
 * (_getAnimationsState / _animationsDisabled).
 */

import {MediaMatcher} from '@angular/cdk/layout';
import {ANIMATION_MODULE_TYPE, InjectionToken, inject} from '@angular/core';
import {MATERIAL_ANIMATIONS} from '@angular/material/core';

/** Public re-export for consumers/docs that prefer the legacy-core entry. */
export {MATERIAL_ANIMATIONS};

/** Owned state labels for lifecycle/tests (mirrors Material public semantics). */
export type LegacyAnimationsState = 'enabled' | 'di-disabled' | 'reduced-motion';

/**
 * Optional override token for unit tests that cannot construct Material's
 * MATERIAL_ANIMATIONS provider graph. Production code should prefer
 * MATERIAL_ANIMATIONS / ANIMATION_MODULE_TYPE.
 */
export const LEGACY_ANIMATIONS_TEST_OVERRIDE = new InjectionToken<LegacyAnimationsState | null>(
  'LEGACY_ANIMATIONS_TEST_OVERRIDE',
);

/**
 * Resolves whether legacy overlay motion should run.
 * Must be called in an injection context.
 */
export function getLegacyAnimationsState(): LegacyAnimationsState {
  const testOverride = inject(LEGACY_ANIMATIONS_TEST_OVERRIDE, {optional: true});
  if (testOverride) {
    return testOverride;
  }

  const materialConfig = inject(MATERIAL_ANIMATIONS, {optional: true});
  if (materialConfig?.animationsDisabled) {
    return 'di-disabled';
  }

  if (inject(ANIMATION_MODULE_TYPE, {optional: true}) === 'NoopAnimations') {
    return 'di-disabled';
  }

  try {
    const reduced = inject(MediaMatcher).matchMedia('(prefers-reduced-motion)').matches;
    return reduced ? 'reduced-motion' : 'enabled';
  } catch {
    // SSR / missing MediaMatcher — treat as enabled rather than guessing reduced.
    return 'enabled';
  }
}

/** True when DI or reduced-motion asks overlays to skip meaningful motion. */
export function legacyAnimationsDisabled(): boolean {
  return getLegacyAnimationsState() !== 'enabled';
}

/** Zero-duration params used when dialog (and similar) should noop motion. */
export const LEGACY_ZERO_ANIMATION_PARAMS = {
  enterAnimationDuration: '0ms',
  exitAnimationDuration: '0ms',
} as const;

/** Generic zero map for parameterized overlay recipes. */
export function zeroAnimationParams<T extends Record<string, string>>(defaults: T): T {
  const out = {} as T;
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    out[key] = '0ms' as T[keyof T];
  }
  return out;
}

/**
 * Build `{value, params}` for Angular animation host bindings.
 * When disabled, every provided default duration becomes `0ms`.
 */
export function legacyAnimationTriggerState<T extends Record<string, string>>(
  value: string,
  defaults: T,
  disabled: boolean,
): {value: string; params: T} {
  return {
    value,
    params: disabled ? zeroAnimationParams(defaults) : defaults,
  };
}
