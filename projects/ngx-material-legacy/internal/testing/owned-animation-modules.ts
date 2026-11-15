/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Test providers that publish LEGACY_ANIMATION_MODE without importing
 * `@angular/animations` or `@angular/platform-browser/animations`.
 * These are providers, not NgModules, so artifact-mode spec bundles can load
 * them. Legacy components read the token; they do not run the animation engine.
 */
import {Provider} from '@angular/core';
import {LEGACY_ANIMATION_MODE} from '@ngx-compat/material-legacy/legacy-core';

export const LEGACY_NOOP_ANIMATIONS: Provider = {
  provide: LEGACY_ANIMATION_MODE,
  useValue: 'NoopAnimations',
};

export const LEGACY_ENABLED_ANIMATIONS: Provider = {
  provide: LEGACY_ANIMATION_MODE,
  useValue: 'BrowserAnimations',
};
